package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

func IsValidEmail(email string) bool {
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	return emailRegex.MatchString(email)
}

func ValidatePassword(password string) []string {
	var errors []string

	if len(password) < 8 {
		errors = append(errors, "Password must be at least 8 characters long")
	}

	if len(password) > 128 {
		errors = append(errors, "Password must be less than 128 characters long")
	}

	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		errors = append(errors, "Password must contain at least one uppercase letter")
	}

	if !hasLower {
		errors = append(errors, "Password must contain at least one lowercase letter")
	}

	if !hasNumber {
		errors = append(errors, "Password must contain at least one number")
	}

	if !hasSpecial {
		errors = append(errors, "Password must contain at least one special character")
	}

	return errors
}

func ValidateName(name string) []string {
	var errors []string
	
	name = strings.TrimSpace(name)
	
	if len(name) < 2 {
		errors = append(errors, "Name must be at least 2 characters long")
	}

	if len(name) > 100 {
		errors = append(errors, "Name must be less than 100 characters long")
	}

	// Check for invalid characters (basic validation)
	invalidChars := regexp.MustCompile(`[<>{}[\]\\|;:'"?,./~!@#$%^&*()_+=0-9]`)
	if invalidChars.MatchString(name) {
		errors = append(errors, "Name contains invalid characters")
	}

	return errors
}

func SanitizeInput(input string) string {
	// Remove leading/trailing whitespace
	sanitized := strings.TrimSpace(input)
	
	// Replace multiple spaces with single space
	spaceRegex := regexp.MustCompile(`\s+`)
	sanitized = spaceRegex.ReplaceAllString(sanitized, " ")
	
	return sanitized
}