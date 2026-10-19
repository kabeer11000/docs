package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strconv"
	"strings"

	"authentication-service/constants"
	"authentication-service/utils"
)

type EmailService struct {
	smtpHost    string
	smtpPort    int
	smtpUser    string
	smtpPass    string
	fromEmail   string
	fromName    string
	frontendURL string
}

func NewEmailService() *EmailService {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv(constants.EnvFromEmail)
	fromName := os.Getenv(constants.EnvFromName)
	frontendURL := os.Getenv(constants.EnvFrontendURL)

	if smtpHost == "" {
		smtpHost = "smtp.turbo-smtp.com"
	}

	smtpPort := 587
	if smtpPortStr != "" {
		if port, err := strconv.Atoi(smtpPortStr); err == nil {
			smtpPort = port
		}
	}

	if fromEmail == "" {
		fromEmail = "noreply@example.com"
	}
	if fromName == "" {
		fromName = "Auth Service"
	}
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	return &EmailService{
		smtpHost:    smtpHost,
		smtpPort:    smtpPort,
		smtpUser:    smtpUser,
		smtpPass:    smtpPass,
		fromEmail:   fromEmail,
		fromName:    fromName,
		frontendURL: frontendURL,
	}
}

// SendVerificationEmail sends an email verification link
func (s *EmailService) SendVerificationEmail(ctx context.Context, to, name, token string) error {
	logger := utils.GetLogger()

	verificationURL := fmt.Sprintf("%s/auth/verify-email?token=%s", s.frontendURL, token)

	htmlBody := s.getVerificationEmailHTML(name, verificationURL)
	textBody := s.getVerificationEmailText(name, verificationURL)

	err := s.sendEmail(to, "Verify Your Email Address", htmlBody, textBody)
	if err != nil {
		logger.Error().Err(err).
			Str("to", to).
			Msg("Failed to send verification email")
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	logger.Info().
		Str("to", to).
		Msg("Verification email sent successfully")

	return nil
}

// SendPasswordResetEmail sends a password reset link
func (s *EmailService) SendPasswordResetEmail(ctx context.Context, to, name, token string) error {
	logger := utils.GetLogger()

	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s", s.frontendURL, token)

	htmlBody := s.getPasswordResetEmailHTML(name, resetURL)
	textBody := s.getPasswordResetEmailText(name, resetURL)

	err := s.sendEmail(to, "Reset Your Password", htmlBody, textBody)
	if err != nil {
		logger.Error().Err(err).
			Str("to", to).
			Msg("Failed to send password reset email")
		return fmt.Errorf("failed to send password reset email: %w", err)
	}

	logger.Info().
		Str("to", to).
		Msg("Password reset email sent successfully")

	return nil
}

// sendEmail sends an email via SMTP
func (s *EmailService) sendEmail(to, subject, htmlBody, textBody string) error {
	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)

	// Build email headers
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "multipart/alternative; boundary=\"boundary123\""

	// Build message body
	var message strings.Builder
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")

	// Add plain text part
	message.WriteString("--boundary123\r\n")
	message.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	message.WriteString("\r\n")
	message.WriteString(textBody)
	message.WriteString("\r\n\r\n")

	// Add HTML part
	message.WriteString("--boundary123\r\n")
	message.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	message.WriteString("\r\n")
	message.WriteString(htmlBody)
	message.WriteString("\r\n\r\n")

	message.WriteString("--boundary123--")

	// SMTP authentication
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)

	// TLS config
	tlsConfig := &tls.Config{
		ServerName: s.smtpHost,
	}

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%d", s.smtpHost, s.smtpPort)

	// For port 587, use STARTTLS
	if s.smtpPort == 587 || s.smtpPort == 25 {
		// Connect without TLS first
		client, err := smtp.Dial(addr)
		if err != nil {
			return fmt.Errorf("failed to connect to SMTP server: %w", err)
		}
		defer client.Close()

		// Start TLS
		if err = client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("failed to start TLS: %w", err)
		}

		// Authenticate
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("failed to authenticate: %w", err)
		}

		// Set sender and recipient
		if err = client.Mail(s.fromEmail); err != nil {
			return fmt.Errorf("failed to set sender: %w", err)
		}
		if err = client.Rcpt(to); err != nil {
			return fmt.Errorf("failed to set recipient: %w", err)
		}

		// Send the email body
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("failed to get data writer: %w", err)
		}
		_, err = w.Write([]byte(message.String()))
		if err != nil {
			return fmt.Errorf("failed to write email body: %w", err)
		}
		err = w.Close()
		if err != nil {
			return fmt.Errorf("failed to close data writer: %w", err)
		}

		return client.Quit()
	}

	// For port 465, use implicit TLS
	return smtp.SendMail(addr, auth, s.fromEmail, []string{to}, []byte(message.String()))
}

// getVerificationEmailHTML returns the HTML template for verification email
func (s *EmailService) getVerificationEmailHTML(name, verificationURL string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%%; background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to Lexa!</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1a202c; font-size: 22px; font-weight: 600;">Hi %s,</h2>
                            <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 24px;">
                                Thank you for registering! Please verify your email address to complete your registration and access all features.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="%s" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all; color: #667eea; font-size: 13px;">
                                %s
                            </p>

                            <div style="margin-top: 32px; padding: 16px; background-color: #fff5f5; border-left: 4px solid #fc8181; border-radius: 4px;">
                                <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 20px;">
                                    <strong>⏰ This link will expire in 24 hours.</strong>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 8px; color: #718096; font-size: 13px;">
                                If you didn't create this account, please ignore this email.
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                © 2025 Lexa. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`, name, verificationURL, verificationURL)
}

// getVerificationEmailText returns the plain text version
func (s *EmailService) getVerificationEmailText(name, verificationURL string) string {
	return fmt.Sprintf(`Hi %s,

Thank you for registering! Please verify your email address to complete your registration.

Click the link below to verify your email:
%s

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

© 2025 Lexa. All rights reserved.
	`, name, verificationURL)
}

// getPasswordResetEmailHTML returns the HTML template for password reset email
func (s *EmailService) getPasswordResetEmailHTML(name, resetURL string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%%; background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1a202c; font-size: 22px; font-weight: 600;">Hi %s,</h2>
                            <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 24px;">
                                We received a request to reset your password. Click the button below to create a new password.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="%s" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all; color: #f5576c; font-size: 13px;">
                                %s
                            </p>

                            <div style="margin-top: 32px; padding: 16px; background-color: #fffaf0; border-left: 4px solid #ed8936; border-radius: 4px;">
                                <p style="margin: 0 0 8px; color: #7c2d12; font-size: 14px; line-height: 20px;">
                                    <strong>⚠️ Security Notice:</strong>
                                </p>
                                <ul style="margin: 8px 0 0 20px; padding: 0; color: #7c2d12; font-size: 13px; line-height: 20px;">
                                    <li>This link will expire in 1 hour</li>
                                    <li>If you didn't request this reset, please ignore this email</li>
                                    <li>Your password won't change unless you click the link above</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 8px; color: #718096; font-size: 13px;">
                                For security reasons, we cannot tell you your current password.
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                © 2025 Lexa. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`, name, resetURL, resetURL)
}

// getPasswordResetEmailText returns the plain text version
func (s *EmailService) getPasswordResetEmailText(name, resetURL string) string {
	return fmt.Sprintf(`Hi %s,

We received a request to reset your password. Click the link below to create a new password:
%s

Security Notice:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Your password won't change unless you click the link above

For security reasons, we cannot tell you your current password.

© 2025 Lexa. All rights reserved.
	`, name, resetURL)
}
