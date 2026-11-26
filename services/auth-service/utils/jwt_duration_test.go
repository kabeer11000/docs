package utils

import (
	"testing"
	"time"
)

func TestParseTokenDuration(t *testing.T) {
	cases := []struct {
		in   string
		want time.Duration
		ok   bool
	}{
		{"7d", 7 * 24 * time.Hour, true},
		{"30d", 30 * 24 * time.Hour, true},
		{"15m", 15 * time.Minute, true},
		{"1h", time.Hour, true},
		{"60", 60 * time.Minute, true},
		{" 7d ", 7 * 24 * time.Hour, true},
		{"", 0, false},
		{"0d", 0, false},
		{"-5m", 0, false},
		{"abc", 0, false},
	}
	for _, c := range cases {
		got, ok := parseTokenDuration(c.in)
		if got != c.want || ok != c.ok {
			t.Errorf("parseTokenDuration(%q) = %v, %v; want %v, %v", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestGetTokenDurationFallsBackToDefault(t *testing.T) {
	t.Setenv("TEST_TOKEN_EXPIRES", "garbage")
	if got := getTokenDuration("TEST_TOKEN_EXPIRES", "7d"); got != 7*24*time.Hour {
		t.Fatalf("fallback = %v, want 168h", got)
	}
	t.Setenv("TEST_TOKEN_EXPIRES", "7d")
	if got := getTokenDuration("TEST_TOKEN_EXPIRES", "15m"); got != 7*24*time.Hour {
		t.Fatalf("env = %v, want 168h", got)
	}
}
