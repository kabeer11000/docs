package handlers

import (
	"errors"
	"fmt"
	"net/http"

	autherrors "authentication-service/errors"
	"authentication-service/models"
	"authentication-service/services"
	"authentication-service/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	ctx := c.Request.Context()
	var req models.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	response, err := h.authService.Register(ctx, req)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "registration_failed"

		if errors.Is(err, autherrors.ErrUserAlreadyExists) {
			statusCode = http.StatusConflict
			errorCode = "user_exists"
		}

		c.JSON(statusCode, gin.H{
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, response)
}

func (h *AuthHandler) Login(c *gin.Context) {
	ctx := c.Request.Context()
	var req models.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	response, err := h.authService.Login(ctx, req)
	if err != nil {
		statusCode := http.StatusUnauthorized
		errorCode := "authentication_failed"

		if errors.Is(err, autherrors.ErrPasswordAuthDisabled) {
			statusCode = http.StatusForbidden
			errorCode = "auth_method_not_available"
		}

		c.JSON(statusCode, gin.H{
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	ctx := c.Request.Context()
	var req models.TokenRefreshRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	response, err := h.authService.RefreshToken(ctx, req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "token_refresh_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) RevokeToken(c *gin.Context) {
	ctx := c.Request.Context()
	var req models.TokenRefreshRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	// Get user ID from the refresh token
	claims, err := utils.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_token",
			"message": "Invalid refresh token",
		})
		return
	}

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_token",
			"message": "Invalid user ID in token",
		})
		return
	}

	err = h.authService.RevokeRefreshToken(ctx, userID, req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "revocation_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Token revoked successfully",
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	ctx := c.Request.Context()
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

	user, err := h.authService.GetUserByID(ctx, objectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "user_not_found",
			"message": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// For JWT-based auth, logout is primarily handled client-side
	// by removing the tokens. We can add token blacklisting here if needed

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) SearchUsers(c *gin.Context) {
	// Get authenticated user's claims from context
	tokenClaims, exists := c.Get("token_claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Token claims not found in context",
		})
		return
	}

	claims, ok := tokenClaims.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "invalid_claims",
			"message": "Invalid token claims format",
		})
		return
	}

	tenantIDStr := claims.TenantID
	if tenantIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_tenant_id",
			"message": "Tenant ID not found in token",
		})
		return
	}

	// Get search query parameter
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "Search query parameter 'q' is required",
		})
		return
	}

	// Get limit parameter (default 10, max 50)
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		// Simple parsing - just use the default if invalid
		var parsedLimit int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsedLimit); err == nil {
			if parsedLimit > 0 && parsedLimit <= 50 {
				limit = parsedLimit
			}
		}
	}

	// Search users
	users, err := h.authService.SearchUsers(c.Request.Context(), query, tenantIDStr, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "search_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"count": len(users),
	})
}
