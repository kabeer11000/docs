package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	autherrors "authentication-service/errors"
	"authentication-service/models"
	"authentication-service/repositories"
	"authentication-service/utils"

	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleOAuthService struct {
	config    *oauth2.Config
	userRepo  *repositories.UserRepository
	stateRepo *repositories.StateRepository
}

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Locale        string `json:"locale"`
}

func NewGoogleOAuthService(userRepo *repositories.UserRepository, stateRepo *repositories.StateRepository) *GoogleOAuthService {
	config := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &GoogleOAuthService{
		config:    config,
		userRepo:  userRepo,
		stateRepo: stateRepo,
	}
}

func (s *GoogleOAuthService) GetAuthURL(ctx context.Context) (string, string, error) {
	state, err := utils.GenerateState()
	if err != nil {
		return "", "", err
	}

	// Store state in database
	stateModel := models.GoogleAuthState{
		State:     state,
		ExpiresAt: time.Now().Add(10 * time.Minute),
		CreatedAt: time.Now(),
	}

	err = s.stateRepo.Create(ctx, &stateModel)
	if err != nil {
		return "", "", err
	}

	url := s.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	return url, state, nil
}

func (s *GoogleOAuthService) HandleCallback(ctx context.Context, code, state string) (*models.AuthResponse, error) {
	// Verify state
	isValid, err := s.stateRepo.ValidateAndConsume(ctx, state)
	if err != nil {
		return nil, err
	}
	if !isValid {
		return nil, autherrors.ErrInvalidOAuthState
	}

	// Exchange code for token (use context with timeout)
	exchangeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	token, err := s.config.Exchange(exchangeCtx, code)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", autherrors.ErrOAuthExchangeFailed, err)
	}

	// Get user info from Google
	userInfo, err := s.getUserInfo(ctx, token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", autherrors.ErrOAuthUserInfoFailed, err)
	}

	// Check if user exists by Google ID
	existingUser, err := s.userRepo.GetByGoogleID(ctx, userInfo.ID)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, err
	}

	var user *models.User

	if existingUser != nil {
		// User exists, update last login
		user = existingUser
		go func() {
			bgCtx := context.Background()
			_ = s.userRepo.UpdateLastLogin(bgCtx, user.ID)
		}()
	} else {
		// Check if user exists by email
		existingEmailUser, err := s.userRepo.GetByEmail(ctx, userInfo.Email)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, err
		}

		if existingEmailUser != nil {
			// Link Google account to existing user
			user = existingEmailUser
			user.GoogleID = userInfo.ID

			// Add Google auth method if not already present
			hasGoogleAuth := false
			for _, method := range user.AuthMethods {
				if method == models.AuthMethodGoogle {
					hasGoogleAuth = true
					break
				}
			}
			if !hasGoogleAuth {
				user.AuthMethods = append(user.AuthMethods, models.AuthMethodGoogle)
			}

			err = s.userRepo.Update(ctx, user)
			if err != nil {
				return nil, err
			}
		} else {
			// Create new user
			now := time.Now()
			user = &models.User{
				Email:         userInfo.Email,
				Name:          userInfo.Name,
				GoogleID:      userInfo.ID,
				AuthMethods:   []models.AuthMethod{models.AuthMethodGoogle},
				EmailVerified: userInfo.VerifiedEmail,
				Subscription: models.Subscription{
					Plan:      models.PlanFree,
					Status:    "active",
					ExpiresAt: nil,
					CreatedAt: now,
					UpdatedAt: now,
				},
			}

			err = s.userRepo.Create(ctx, user)
			if err != nil {
				return nil, err
			}
		}
	}

	// Generate tokens using the auth service
	authService := NewAuthService(s.userRepo)
	return authService.generateTokenResponse(ctx, user)
}

func (s *GoogleOAuthService) getUserInfo(ctx context.Context, accessToken string) (*GoogleUserInfo, error) {
	// Create request with context
	req, err := http.NewRequestWithContext(ctx, "GET", "https://www.googleapis.com/oauth2/v2/userinfo?access_token="+accessToken, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info, status: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo GoogleUserInfo
	err = json.Unmarshal(data, &userInfo)
	if err != nil {
		return nil, err
	}

	return &userInfo, nil
}
