package middleware

import (
	"net/http"
	"strings"

	"authentication-service/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "missing_authorization_header",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_authorization_header",
				"message": "Authorization header must be in the format 'Bearer <token>'",
			})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_token",
				"message": err.Error(),
			})
			c.Abort()
			return
		}

		// Check token type (should be access token for API access)
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_token_type",
				"message": "Access token required",
			})
			c.Abort()
			return
		}

		// Convert user ID to ObjectID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "invalid_user_id",
				"message": "Invalid user ID in token",
			})
			c.Abort()
			return
		}

		// Store user information in context
		c.Set("user_id", userID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("token_claims", claims)

		c.Next()
	}
}

func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check if it's a Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Check token type
		if claims.TokenType != "access" {
			c.Next()
			return
		}

		// Convert user ID to ObjectID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.Next()
			return
		}

		// Store user information in context
		c.Set("user_id", userID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("token_claims", claims)

		c.Next()
	}
}