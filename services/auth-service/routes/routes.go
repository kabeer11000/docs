package routes

import (
	"authentication-service/handlers"
	"authentication-service/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	authHandler *handlers.AuthHandler,
	googleHandler *handlers.GoogleOAuthHandler,
	webauthnHandler *handlers.WebAuthnHandler,
	verificationHandler *handlers.VerificationHandler,
) *gin.Engine {
	router := gin.New()

	// Global middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.SecurityHeadersMiddleware()) // Add security headers first
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.RateLimitMiddleware())

	// Health check endpoints
	router.GET("/health", handlers.HealthCheck)
	router.GET("/health/live", handlers.LivenessCheck)
	router.GET("/health/ready", handlers.ReadinessCheck)

	// API version 1
	v1 := router.Group("/api/v1")
	{
		// Authentication routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/revoke", authHandler.RevokeToken)
			auth.POST("/logout", authHandler.Logout)

			// Email verification routes
			auth.GET("/verify-email", verificationHandler.VerifyEmail)
			auth.POST("/verify-email/resend", verificationHandler.ResendVerificationEmail)

			// Password reset routes
			auth.POST("/password-reset/request", verificationHandler.RequestPasswordReset)
			auth.POST("/password-reset/confirm", verificationHandler.ResetPassword)

			// Google OAuth routes
			google := auth.Group("/google")
			{
				google.GET("/init", googleHandler.InitiateAuth)
				google.GET("/callback", googleHandler.HandleCallback)
				google.DELETE("/disconnect", middleware.AuthMiddleware(), googleHandler.Disconnect)
			}

			// WebAuthn/Passkey routes
			passkey := auth.Group("/passkey")
			{
				// Login flow (no auth required)
				passkey.POST("/login/begin", webauthnHandler.BeginLogin)
				passkey.POST("/login/finish/:challengeId", webauthnHandler.FinishLogin)
			}
		}

		// Protected routes (require authentication)
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// User profile
			protected.GET("/profile", authHandler.GetProfile)

			// User search
			protected.GET("/users/search", authHandler.SearchUsers)

			// Passkey management (requires auth)
			passkey := protected.Group("/passkey")
			{
				passkey.POST("/register/begin", webauthnHandler.BeginRegistration)
				passkey.POST("/register/finish/:challengeId", webauthnHandler.FinishRegistration)
				passkey.GET("/credentials", webauthnHandler.ListCredentials)
				passkey.DELETE("/credentials/:credentialId", webauthnHandler.DeleteCredential)
			}
		}
	}

	return router
}