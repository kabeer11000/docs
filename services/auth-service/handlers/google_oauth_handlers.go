package handlers

import (
	"errors"
	"net/http"

	autherrors "authentication-service/errors"
	"authentication-service/services"

	"github.com/gin-gonic/gin"
)

type GoogleOAuthHandler struct {
	googleService *services.GoogleOAuthService
}

func NewGoogleOAuthHandler(googleService *services.GoogleOAuthService) *GoogleOAuthHandler {
	return &GoogleOAuthHandler{
		googleService: googleService,
	}
}

func (h *GoogleOAuthHandler) InitiateAuth(c *gin.Context) {
	ctx := c.Request.Context()

	url, state, err := h.googleService.GetAuthURL(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "auth_initiation_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"auth_url": url,
		"state":    state,
	})
}

func (h *GoogleOAuthHandler) HandleCallback(c *gin.Context) {
	ctx := c.Request.Context()

	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	// Check for OAuth error
	if errorParam != "" {
		errorDescription := c.Query("error_description")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "oauth_error",
			"message": errorDescription,
			"details": errorParam,
		})
		return
	}

	// Validate required parameters
	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_parameters",
			"message": "Missing required parameters: code and state",
		})
		return
	}

	// Handle the callback
	response, err := h.googleService.HandleCallback(ctx, code, state)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "oauth_callback_failed"

		// Handle specific error cases using errors.Is
		if errors.Is(err, autherrors.ErrInvalidOAuthState) {
			statusCode = http.StatusBadRequest
			errorCode = "invalid_state"
		} else if errors.Is(err, autherrors.ErrOAuthExchangeFailed) {
			statusCode = http.StatusBadGateway
			errorCode = "oauth_exchange_failed"
		} else if errors.Is(err, autherrors.ErrOAuthUserInfoFailed) {
			statusCode = http.StatusBadGateway
			errorCode = "user_info_failed"
		}

		c.JSON(statusCode, gin.H{
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	// Successful authentication
	c.JSON(http.StatusOK, response)
}

func (h *GoogleOAuthHandler) Disconnect(c *gin.Context) {
	// This endpoint would handle disconnecting the Google account
	// For now, we'll return a placeholder response
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "not_implemented",
		"message": "Google account disconnection not yet implemented",
	})
}
