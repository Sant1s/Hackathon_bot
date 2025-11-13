package main

import (
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword хеширует пароль с использованием bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(bytes), nil
}

// CheckPassword проверяет соответствие пароля хешу
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateMinIOURL генерирует полный URL для объекта в MinIO
func GenerateMinIOURL(endpoint string, useSSL bool, bucketName, objectKey string) string {
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	// Убираем порт из endpoint если он есть для публичного URL
	host := endpoint
	if strings.Contains(host, ":") {
		parts := strings.Split(host, ":")
		host = parts[0]
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, host, bucketName, objectKey)
}

// FormatPhone форматирует номер телефона (базовая валидация)
func FormatPhone(phone string) string {
	// Убираем все пробелы и дефисы
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	return phone
}

