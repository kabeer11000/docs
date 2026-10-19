package handlers

import (
	"net/http"

	"authentication-service/services"

	"github.com/gin-gonic/gin"
)

type VerificationHandler struct {
	verificationService *services.VerificationService
	passwordResetService *services.PasswordResetService
}

func NewVerificationHandler(
	verificationService *services.VerificationService,
	passwordResetService *services.PasswordResetService,
) *VerificationHandler {
	return &VerificationHandler{
		verificationService: verificationService,
		passwordResetService: passwordResetService,
	}
}

// VerifyEmail handles email verification
func (h *VerificationHandler) VerifyEmail(c *gin.Context) {
	ctx := c.Request.Context()

	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_token",
			"message": "Verification token is required",
		})
		return
	}

	if err := h.verificationService.VerifyEmail(ctx, token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "verification_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully",
	})
}

// ResendVerificationEmail handles resending verification email
func (h *VerificationHandler) ResendVerificationEmail(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	if err := h.verificationService.ResendVerificationEmail(ctx, req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "resend_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Verification email sent",
	})
}

// RequestPasswordReset handles password reset requests
func (h *VerificationHandler) RequestPasswordReset(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	// Always return success to prevent user enumeration
	_ = h.passwordResetService.RequestPasswordReset(ctx, req.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "If an account exists with this email, a password reset link has been sent",
	})
}

// ResetPassword handles password reset confirmation
func (h *VerificationHandler) ResetPassword(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8,max=128"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	if err := h.passwordResetService.ResetPassword(ctx, req.Token, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "reset_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully. Please log in with your new password",
	})
}
