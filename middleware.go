package main

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const UserRoleKey contextKey = "role"

// JWTAuthMiddleware проверяет JWT токен и добавляет user_id в контекст
func JWTAuthMiddleware(cfg *Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			tokenString, err := ExtractTokenFromHeader(authHeader)
			if err != nil {
				WriteError(w, NewUnauthorizedError("Не авторизован"))
				return
			}

			claims, err := ValidateToken(cfg, tokenString)
			if err != nil {
				WriteError(w, NewUnauthorizedError("Неверный токен"))
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RoleMiddleware проверяет, что у пользователя есть одна из указанных ролей
func RoleMiddleware(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value(UserRoleKey).(string)
			if !ok {
				WriteError(w, NewUnauthorizedError("Роль не найдена"))
				return
			}

			hasRole := false
			for _, role := range roles {
				if userRole == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				WriteError(w, NewForbiddenError("Недостаточно прав"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CORS middleware для настройки CORS
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GetUserIDFromContext извлекает user_id из контекста
func GetUserIDFromContext(ctx context.Context) (int64, error) {
	userID, ok := ctx.Value(UserIDKey).(int64)
	if !ok {
		return 0, NewUnauthorizedError("Пользователь не найден в контексте")
	}
	return userID, nil
}

// GetUserRoleFromContext извлекает роль из контекста
func GetUserRoleFromContext(ctx context.Context) (string, error) {
	role, ok := ctx.Value(UserRoleKey).(string)
	if !ok {
		return "", NewUnauthorizedError("Роль не найдена в контексте")
	}
	return role, nil
}

// RecoverMiddleware обрабатывает паники
func RecoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				WriteError(w, NewInternalError("Внутренняя ошибка сервера"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware логирует запросы (базовая реализация)
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Можно добавить логирование здесь
		next.ServeHTTP(w, r)
	})
}

// ContentTypeMiddleware проверяет Content-Type для определенных методов
func ContentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" || r.Method == "PATCH" || r.Method == "PUT" {
			contentType := r.Header.Get("Content-Type")
			// Для multipart/form-data и application/json
			if !strings.HasPrefix(contentType, "multipart/form-data") &&
				!strings.HasPrefix(contentType, "application/json") &&
				contentType != "" {
				// Не блокируем, но можно добавить проверку если нужно
			}
		}
		next.ServeHTTP(w, r)
	})
}

