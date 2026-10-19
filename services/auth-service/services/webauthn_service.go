package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"authentication-service/models"
	"authentication-service/repositories"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type WebAuthnService struct {
	webAuthn     *webauthn.WebAuthn
	userRepo     *repositories.UserRepository
	sessionRepo  *repositories.WebAuthnSessionRepository
}


func NewWebAuthnService(userRepo *repositories.UserRepository, sessionRepo *repositories.WebAuthnSessionRepository) (*WebAuthnService, error) {
	rpID := os.Getenv("WEBAUTHN_RPID")
	if rpID == "" {
		rpID = "localhost"
	}

	rpOrigin := os.Getenv("WEBAUTHN_ORIGIN")
	if rpOrigin == "" {
		rpOrigin = "http://localhost:8080"
	}

	rpDisplayName := os.Getenv("WEBAUTHN_DISPLAY_NAME")
	if rpDisplayName == "" {
		rpDisplayName = "Lexa Authentication"
	}

	wconfig := &webauthn.Config{
		RPDisplayName: rpDisplayName,
		RPID:          rpID,
		RPOrigin:      rpOrigin,
		RPIcon:        "",
	}

	webAuthn, err := webauthn.New(wconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create WebAuthn instance: %v", err)
	}

	return &WebAuthnService{
		webAuthn:    webAuthn,
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
	}, nil
}

func (s *WebAuthnService) BeginRegistration(ctx context.Context, userID primitive.ObjectID) (*protocol.CredentialCreation, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	creation, session, err := s.webAuthn.BeginRegistration(user)
	if err != nil {
		return nil, fmt.Errorf("failed to begin registration: %v", err)
	}

	// Store session data
	sessionData, err := json.Marshal(session)
	if err != nil {
		return nil, err
	}

	sessionModel := models.WebAuthnSessionData{
		UserID:      userID,
		SessionData: string(sessionData),
		Type:        "registration",
		ExpiresAt:   time.Now().Add(5 * time.Minute),
	}

	err = s.sessionRepo.Store(ctx, creation.Response.Challenge.String(), sessionModel)
	if err != nil {
		return nil, err
	}

	return creation, nil
}

func (s *WebAuthnService) FinishRegistration(ctx context.Context, userID primitive.ObjectID, challengeID string, request *http.Request) error {
	// Get session data
	sessionData, err := s.sessionRepo.Get(ctx, challengeID)
	if err != nil {
		return err
	}

	if sessionData.Type != "registration" || sessionData.UserID != userID {
		return errors.New("invalid session")
	}

	// Parse session
	var session webauthn.SessionData
	err = json.Unmarshal([]byte(sessionData.SessionData), &session)
	if err != nil {
		return err
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	credential, err := s.webAuthn.FinishRegistration(user, session, request)
	if err != nil {
		return fmt.Errorf("failed to finish registration: %v", err)
	}

	// Convert transport types
	var transports []string
	for _, t := range credential.Transport {
		transports = append(transports, string(t))
	}

	// Store credential
	credentialModel := models.Credential{
		ID:              string(credential.ID),
		PublicKey:       credential.PublicKey,
		AttestationType: credential.AttestationType,
		Transport:       transports,
		Flags:           []byte{}, // Store flags as needed
		Authenticator:   []byte{}, // Store authenticator data as needed
		CreatedAt:       time.Now(),
	}

	err = s.userRepo.AddCredential(ctx, userID, credentialModel)
	if err != nil {
		return err
	}

	// Add passkey auth method if not already present
	hasPasskeyAuth := false
	for _, method := range user.AuthMethods {
		if method == models.AuthMethodPasskey {
			hasPasskeyAuth = true
			break
		}
	}

	if !hasPasskeyAuth {
		user.AuthMethods = append(user.AuthMethods, models.AuthMethodPasskey)
		err = s.userRepo.Update(ctx, user)
		if err != nil {
			// Log error but don't fail
		}
	}

	// Clean up session
	s.sessionRepo.Delete(ctx, challengeID)

	return nil
}

func (s *WebAuthnService) BeginLogin(ctx context.Context, email, tenantID string) (*protocol.CredentialAssertion, error) {
	user, err := s.userRepo.GetByEmailAndTenant(ctx, email, tenantID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Check if user has passkey auth method
	hasPasskeyAuth := false
	for _, method := range user.AuthMethods {
		if method == models.AuthMethodPasskey {
			hasPasskeyAuth = true
			break
		}
	}

	if !hasPasskeyAuth {
		return nil, errors.New("passkey authentication not enabled for this account")
	}

	assertion, session, err := s.webAuthn.BeginLogin(user)
	if err != nil {
		return nil, fmt.Errorf("failed to begin login: %v", err)
	}

	// Store session data
	sessionData, err := json.Marshal(session)
	if err != nil {
		return nil, err
	}

	sessionModel := models.WebAuthnSessionData{
		UserID:      user.ID,
		SessionData: string(sessionData),
		Type:        "login",
		ExpiresAt:   time.Now().Add(5 * time.Minute),
	}

	err = s.sessionRepo.Store(ctx, assertion.Response.Challenge.String(), sessionModel)
	if err != nil {
		return nil, err
	}

	return assertion, nil
}

func (s *WebAuthnService) FinishLogin(ctx context.Context, challengeID string, request *http.Request) (*models.AuthResponse, error) {
	// Get session data
	sessionData, err := s.sessionRepo.Get(ctx, challengeID)
	if err != nil {
		return nil, err
	}

	if sessionData.Type != "login" {
		return nil, errors.New("invalid session type")
	}

	// Parse session
	var session webauthn.SessionData
	err = json.Unmarshal([]byte(sessionData.SessionData), &session)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, sessionData.UserID)
	if err != nil {
		return nil, err
	}

	_, err = s.webAuthn.FinishLogin(user, session, request)
	if err != nil {
		return nil, fmt.Errorf("failed to finish login: %v", err)
	}

	// Update last login
	err = s.userRepo.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		// Log error but don't fail
	}

	// Clean up session
	s.sessionRepo.Delete(ctx, challengeID)

	// Generate tokens
	authService := NewAuthService(s.userRepo)
	return authService.generateTokenResponse(ctx, user)
}