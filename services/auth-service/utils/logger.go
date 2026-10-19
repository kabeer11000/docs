package utils

import (
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var Logger zerolog.Logger

func InitLogger() {
	// Set up console writer for development, JSON for production
	logLevel := os.Getenv("LOG_LEVEL")
	environment := os.Getenv("ENVIRONMENT")

	if environment == "production" {
		// JSON logging for production
		Logger = zerolog.New(os.Stdout).With().Timestamp().Caller().Logger()
	} else {
		// Pretty console logging for development
		Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr}).With().Timestamp().Caller().Logger()
	}

	// Set global log level
	switch logLevel {
	case "DEBUG":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "INFO":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "WARN":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "ERROR":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

// GetLogger returns the configured logger instance
func GetLogger() *zerolog.Logger {
	return &Logger
}

// LogAuthAttempt logs authentication attempts with structured fields
func LogAuthAttempt(email, method, result, ip string) {
	Logger.Info().
		Str("email", email).
		Str("method", method).
		Str("result", result).
		Str("ip", ip).
		Msg("Authentication attempt")
}

// LogSecurityEvent logs security-related events
func LogSecurityEvent(event, description, userID, ip string) {
	Logger.Warn().
		Str("event", event).
		Str("description", description).
		Str("user_id", userID).
		Str("ip", ip).
		Msg("Security event")
}
