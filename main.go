package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "tmphackbackend/docs" // swagger docs
)

// @title           Благотворительное приложение API
// @version         1.0
// @description     API для благотворительного приложения "Помощь"
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@example.com

// @license.name  MIT
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Загружаем переменные окружения
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Инициализируем конфигурацию
	cfg := NewConfig()

	// Подключаемся к PostgreSQL
	db, err := NewDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Инициализируем схему базы данных
	if err := db.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Инициализируем MinIO клиент
	minioClient, err := NewMinIOClient(cfg.MinIOConfig)
	if err != nil {
		log.Fatalf("Failed to initialize MinIO client: %v", err)
	}

	// Инициализируем все необходимые buckets
	ctx := context.Background()
	if err := InitAllBuckets(ctx, minioClient); err != nil {
		log.Fatalf("Failed to initialize MinIO buckets: %v", err)
	}

	// Инициализируем роутер
	router := mux.NewRouter()

	// Применяем middleware
	router.Use(RecoverMiddleware)
	router.Use(LoggingMiddleware)
	router.Use(CORSMiddleware)

	// Создаем обработчики
	handlers := NewHandlers(db, minioClient, cfg)

	// Публичные маршруты
	router.HandleFunc("/health", handlers.HealthCheck).Methods("GET")

	// Swagger документация
	router.PathPrefix("/swagger/").Handler(httpSwagger.WrapHandler)

	// API v1 маршруты
	api := router.PathPrefix("/api/v1").Subrouter()

	// Аутентификация (публичные)
	api.HandleFunc("/auth/register", handlers.Register).Methods("POST")
	api.HandleFunc("/auth/login", handlers.Login).Methods("POST")
	api.HandleFunc("/auth/refresh", handlers.RefreshToken).Methods("POST")

	// Защищенные маршруты (требуют JWT)
	protected := api.PathPrefix("").Subrouter()
	protected.Use(JWTAuthMiddleware(cfg))

	// Профиль пользователя
	protected.HandleFunc("/users/me", handlers.GetProfile).Methods("GET")
	protected.HandleFunc("/users/me", handlers.UpdateProfile).Methods("PATCH")
	protected.HandleFunc("/users/me/photo", handlers.UploadPhoto).Methods("POST")
	protected.HandleFunc("/users/me/change-password", handlers.ChangePassword).Methods("POST")

	// Верификация
	protected.HandleFunc("/verifications", handlers.CreateVerification).Methods("POST")
	protected.HandleFunc("/verifications/me", handlers.GetMyVerification).Methods("GET")

	// Верификация (только для админов)
	adminOnly := protected.PathPrefix("").Subrouter()
	adminOnly.Use(RoleMiddleware("admin"))
	adminOnly.HandleFunc("/verifications", handlers.GetVerifications).Methods("GET")
	adminOnly.HandleFunc("/verifications/{id}", handlers.UpdateVerification).Methods("PATCH")

	// Посты
	api.HandleFunc("/posts", handlers.GetPosts).Methods("GET")
	api.HandleFunc("/posts/{id}", handlers.GetPost).Methods("GET")
	protected.HandleFunc("/posts", handlers.CreatePost).Methods("POST")
	protected.HandleFunc("/posts/{id}", handlers.UpdatePost).Methods("PATCH")
	protected.HandleFunc("/posts/{id}", handlers.DeletePost).Methods("DELETE")
	protected.HandleFunc("/posts/{id}/media", handlers.AddPostMedia).Methods("POST")
	protected.HandleFunc("/posts/{id}/media/{media_id}", handlers.DeletePostMedia).Methods("DELETE")

	// Пожертвования
	protected.HandleFunc("/donations", handlers.CreateDonation).Methods("POST")
	api.HandleFunc("/donations", handlers.GetDonations).Methods("GET")
	api.HandleFunc("/donations/{id}", handlers.GetDonation).Methods("GET")
	protected.HandleFunc("/donations/{id}", handlers.UpdateDonation).Methods("PATCH")

	// Чаты
	protected.HandleFunc("/chats", handlers.GetChats).Methods("GET")
	protected.HandleFunc("/chats", handlers.CreateChat).Methods("POST")
	protected.HandleFunc("/chats/{id}/messages", handlers.GetMessages).Methods("GET")
	protected.HandleFunc("/chats/{id}/messages", handlers.SendMessage).Methods("POST")
	protected.HandleFunc("/chats/{id}/messages/read", handlers.MarkMessagesRead).Methods("PATCH")
	protected.HandleFunc("/chats/{id}/messages/{message_id}", handlers.UpdateMessage).Methods("PATCH")
	protected.HandleFunc("/chats/{id}/messages/{message_id}", handlers.DeleteMessage).Methods("DELETE")

	// Рейтинг
	api.HandleFunc("/ratings", handlers.GetRatings).Methods("GET")
	protected.HandleFunc("/ratings/me", handlers.GetMyRating).Methods("GET")

	// Утилиты
	protected.HandleFunc("/upload/presigned-url", handlers.GetPresignedURL).Methods("POST")
	protected.HandleFunc("/files/presigned-url", handlers.GetPresignedGetURL).Methods("POST")

	// Публичный endpoint для получения файлов (проксирование через backend)
	router.HandleFunc("/files/{bucket}/{objectKey:.*}", handlers.GetFile).Methods("GET")

	// Настраиваем HTTP сервер
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Запускаем сервер в горутине
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Ожидаем сигнал для graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
