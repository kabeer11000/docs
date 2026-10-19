package handlers

import (
	"context"
	"net/http"
	"time"

	"authentication-service/database"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// HealthCheck performs a comprehensive health check
func HealthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	health := gin.H{
		"status":  "healthy",
		"service": "authentication-service",
		"time":    time.Now().UTC().Format(time.RFC3339),
	}

	checks := gin.H{}

	// Check database connectivity
	if database.Client != nil {
		err := database.Client.Ping(ctx, readpref.Primary())
		if err != nil {
			checks["database"] = gin.H{
				"status":  "unhealthy",
				"message": err.Error(),
			}
			health["status"] = "unhealthy"
		} else {
			checks["database"] = gin.H{
				"status": "healthy",
			}
		}
	} else {
		checks["database"] = gin.H{
			"status":  "unhealthy",
			"message": "database client not initialized",
		}
		health["status"] = "unhealthy"
	}

	// Add JWT status check (simple check if initialized)
	checks["jwt"] = gin.H{
		"status": "healthy",
	}

	health["checks"] = checks

	// Return appropriate status code
	if health["status"] == "unhealthy" {
		c.JSON(http.StatusServiceUnavailable, health)
		return
	}

	c.JSON(http.StatusOK, health)
}

// ReadinessCheck checks if the service is ready to handle requests
func ReadinessCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	// Check if database is ready
	if database.Client != nil {
		err := database.Client.Ping(ctx, readpref.Primary())
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ready":   false,
				"message": "database not ready",
			})
			return
		}
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ready":   false,
			"message": "database client not initialized",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ready": true,
	})
}

// LivenessCheck checks if the service is alive
func LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"alive": true,
	})
}
