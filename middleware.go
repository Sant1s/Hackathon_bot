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

// CORSMiddleware обрабатывает CORS запросы для всех эндпоинтов
// Пропускает все запросы без ограничений
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Разрешаем все origins - динамически для каждого запроса
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Разрешаем все возможные методы HTTP
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD, CONNECT, TRACE")

		// Разрешаем все заголовки - всегда разрешаем запрошенные заголовки
		requestedHeaders := r.Header.Get("Access-Control-Request-Headers")
		if requestedHeaders != "" {
			// Динамически разрешаем все запрошенные заголовки
			w.Header().Set("Access-Control-Allow-Headers", requestedHeaders)
		} else {
			// Если заголовки не запрошены, разрешаем широкий список распространенных заголовков
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name, X-Custom-Header, Accept-Language, Content-Language, DNT, User-Agent, X-Forwarded-For, X-Real-IP")
		}

		// Кэшируем preflight запросы на 24 часа
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Разрешаем доступ ко всем заголовкам ответа
		w.Header().Set("Access-Control-Expose-Headers", "*")

		// Обрабатываем preflight OPTIONS запросы - ВАЖНО: обрабатываем ДО вызова next
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Пропускаем все остальные запросы
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
