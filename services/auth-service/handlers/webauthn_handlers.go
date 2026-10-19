package handlers

import (
	"net/http"

	"authentication-service/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type WebAuthnHandler struct {
	webauthnService *services.WebAuthnService
}

func NewWebAuthnHandler(webauthnService *services.WebAuthnService) *WebAuthnHandler {
	return &WebAuthnHandler{
		webauthnService: webauthnService,
	}
}

func (h *WebAuthnHandler) BeginRegistration(c *gin.Context) {
	// Get user ID from authentication middleware
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	objectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "invalid_user_id",
			"message": "Invalid user ID format",
		})
		return
	}

	creation, err := h.webauthnService.BeginRegistration(c.Request.Context(), objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "registration_begin_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, creation)
}

func (h *WebAuthnHandler) FinishRegistration(c *gin.Context) {
	// Get user ID from authentication middleware
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	objectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "invalid_user_id",
			"message": "Invalid user ID format",
		})
		return
	}

	challengeID := c.Param("challengeId")
	if challengeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_challenge_id",
			"message": "Challenge ID is required",
		})
		return
	}

	err := h.webauthnService.FinishRegistration(c.Request.Context(), objectID, challengeID, c.Request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "registration_finish_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Passkey registered successfully",
	})
}

func (h *WebAuthnHandler) BeginLogin(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		TenantID string `json:"tenant_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	assertion, err := h.webauthnService.BeginLogin(c.Request.Context(), req.Email, req.TenantID)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "login_begin_failed"

		if err.Error() == "user not found" {
			statusCode = http.StatusNotFound
			errorCode = "user_not_found"
		} else if err.Error() == "passkey authentication not enabled for this account" {
			statusCode = http.StatusForbidden
			errorCode = "passkey_not_enabled"
		}

		c.JSON(statusCode, gin.H{
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, assertion)
}

func (h *WebAuthnHandler) FinishLogin(c *gin.Context) {
	challengeID := c.Param("challengeId")
	if challengeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_challenge_id",
			"message": "Challenge ID is required",
		})
		return
	}

	authResponse, err := h.webauthnService.FinishLogin(c.Request.Context(), challengeID, c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "login_finish_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, authResponse)
}

func (h *WebAuthnHandler) ListCredentials(c *gin.Context) {
	// Get user ID from authentication middleware
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	// This would require implementing credential listing in the service
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "not_implemented",
		"message": "Credential listing not yet implemented",
	})
}

func (h *WebAuthnHandler) DeleteCredential(c *gin.Context) {
	// Get user ID from authentication middleware
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	credentialID := c.Param("credentialId")
	if credentialID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_credential_id",
			"message": "Credential ID is required",
		})
		return
	}

	// This would require implementing credential deletion in the service
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "not_implemented",
		"message": "Credential deletion not yet implemented",
	})
}