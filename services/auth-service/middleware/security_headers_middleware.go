package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds important security headers to all responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking attacks
		c.Header("X-Frame-Options", "DENY")

		// Enable XSS protection in older browsers
		c.Header("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS for 1 year (31536000 seconds)
		// Only add in production when using HTTPS
		if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// Content Security Policy - restrictive default
		// Adjust based on your application's needs
		c.Header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")

		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy (formerly Feature-Policy)
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		c.Next()
	}
}
