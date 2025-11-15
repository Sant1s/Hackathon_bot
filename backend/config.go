package main

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port             string
	DatabaseURL      string
	MinIOConfig      MinIOConfig
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration
}

type MinIOConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	UseSSL          bool
	BucketName      string
	Region          string
}

func NewConfig() *Config {
	// JWT Access token expiry: 24 hours (default)
	accessExpiryHours := getEnvInt("JWT_ACCESS_EXPIRY_HOURS", 24)
	// JWT Refresh token expiry: 7 days (default)
	refreshExpiryDays := getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 7)

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"),
		MinIOConfig: MinIOConfig{
			Endpoint:        getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKeyID:     getEnv("MINIO_ACCESS_KEY_ID", "minioadmin"),
			SecretAccessKey: getEnv("MINIO_SECRET_ACCESS_KEY", "minioadmin"),
			UseSSL:          getEnv("MINIO_USE_SSL", "false") == "true",
			BucketName:      getEnv("MINIO_BUCKET_NAME", "files"),
			Region:          getEnv("MINIO_REGION", "us-east-1"),
		},
		JWTSecret:        getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTAccessExpiry:  time.Duration(accessExpiryHours) * time.Hour,
		JWTRefreshExpiry: time.Duration(refreshExpiryDays) * 24 * time.Hour,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
