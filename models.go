package main

import (
	"database/sql"
	"time"
)

// User модель пользователя
type User struct {
	ID          int64     `json:"id"`
	Phone       string    `json:"phone"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FirstName   string    `json:"first_name" db:"first_name"`
	LastName    string    `json:"last_name" db:"last_name"`
	PhotoURL    *string   `json:"photo_url,omitempty" db:"photo_url"`
	Role        string    `json:"role"`
	HelperName  *string   `json:"helper_name,omitempty" db:"helper_name"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	IsActive    bool      `json:"is_active" db:"is_active"`
}

// Verification модель верификации
type Verification struct {
	ID               int64          `json:"id"`
	UserID           int64          `json:"user_id" db:"user_id"`
	UserPhotoURL     *string        `json:"user_photo_url,omitempty" db:"user_photo_url"`
	LastName         string         `json:"last_name" db:"last_name"`
	FirstName        string         `json:"first_name" db:"first_name"`
	MiddleName       *string        `json:"middle_name,omitempty" db:"middle_name"`
	BirthDate        time.Time      `json:"birth_date" db:"birth_date"`
	PassportSeries   string         `json:"passport_series" db:"passport_series"`
	PassportNumber   string         `json:"passport_number" db:"passport_number"`
	PassportIssuer   string         `json:"passport_issuer" db:"passport_issuer"`
	PassportDate     time.Time      `json:"passport_date" db:"passport_date"`
	DocType          string         `json:"doc_type" db:"doc_type"`
	INN              *string        `json:"inn,omitempty"`
	SNILS            *string        `json:"snils,omitempty"`
	PassportScansURLs []string      `json:"passport_scans_urls,omitempty" db:"passport_scans_urls"`
	Consent1         bool           `json:"consent1"`
	Consent2         bool           `json:"consent2"`
	Consent3         bool           `json:"consent3"`
	Status           string         `json:"status"`
	SubmittedAt      time.Time      `json:"submitted_at" db:"submitted_at"`
	ReviewedAt       *time.Time     `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewedBy       *int64         `json:"reviewed_by,omitempty" db:"reviewed_by"`
	RejectionReason  *string        `json:"rejection_reason,omitempty" db:"rejection_reason"`
}

// Post модель поста
type Post struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Amount      float64   `json:"amount"`
	Collected   float64   `json:"collected"`
	Recipient   string    `json:"recipient"`
	Bank        string    `json:"bank"`
	Phone       string    `json:"phone"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	IsEditable  bool      `json:"is_editable" db:"is_editable"`
}

// PostMedia модель медиа файла поста
type PostMedia struct {
	ID        int64     `json:"id"`
	PostID    int64     `json:"post_id" db:"post_id"`
	MediaURL  string    `json:"media_url" db:"media_url"`
	MediaType string    `json:"media_type" db:"media_type"`
	OrderIndex int      `json:"order_index" db:"order_index"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Donation модель пожертвования
type Donation struct {
	ID          int64      `json:"id"`
	PostID      int64      `json:"post_id" db:"post_id"`
	DonorID     int64      `json:"donor_id" db:"donor_id"`
	Amount      float64    `json:"amount"`
	ReceiptURL  *string    `json:"receipt_url,omitempty" db:"receipt_url"`
	Status      string     `json:"status"`
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty" db:"confirmed_at"`
	ConfirmedBy *int64    `json:"confirmed_by,omitempty" db:"confirmed_by"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
}

// Chat модель чата
type Chat struct {
	ID        int64     `json:"id"`
	PostID    int64     `json:"post_id" db:"post_id"`
	HelperID  int64     `json:"helper_id" db:"helper_id"`
	NeedyID   int64     `json:"needy_id" db:"needy_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Message модель сообщения
type Message struct {
	ID           int64      `json:"id"`
	ChatID       int64      `json:"chat_id" db:"chat_id"`
	SenderID     int64      `json:"sender_id" db:"sender_id"`
	Text         *string    `json:"text,omitempty"`
	AttachmentURL *string   `json:"attachment_url,omitempty" db:"attachment_url"`
	IsRead       bool       `json:"is_read" db:"is_read"`
	IsEdited     bool       `json:"is_edited" db:"is_edited"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

// Rating модель рейтинга
type Rating struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	Points      int       `json:"points"`
	TotalDonated float64 `json:"total_donated" db:"total_donated"`
	Status      *string   `json:"status,omitempty"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// File модель файла (старая, оставляем для совместимости)
type File struct {
	ID              int       `json:"id"`
	Filename        string    `json:"filename"`
	ContentType     string    `json:"content_type"`
	Size            int64     `json:"size"`
	MinIOObjectName string    `json:"-"`
	CreatedAt       time.Time `json:"created_at"`
}

// ========== Request/Response DTOs ==========

// RegisterRequest запрос на регистрацию
type RegisterRequest struct {
	Phone     string `json:"phone" validate:"required"`
	Password  string `json:"password" validate:"required,min=6"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

// RegisterResponse ответ на регистрацию
type RegisterResponse struct {
	UserID  int64  `json:"user_id"`
	Token   string `json:"token"`
	Message string `json:"message"`
}

// LoginRequest запрос на вход
type LoginRequest struct {
	Phone    string `json:"phone" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse ответ на вход
type LoginResponse struct {
	UserID int64      `json:"user_id"`
	Token  string     `json:"token"`
	User   *User      `json:"user"`
}

// RefreshTokenResponse ответ на обновление токена
type RefreshTokenResponse struct {
	Token string `json:"token"`
}

// UpdateProfileRequest запрос на обновление профиля
type UpdateProfileRequest struct {
	FirstName  *string `json:"first_name,omitempty"`
	LastName   *string `json:"last_name,omitempty"`
	HelperName *string `json:"helper_name,omitempty"`
}

// ChangePasswordRequest запрос на изменение пароля
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

// VerificationRequest запрос на верификацию (multipart)
type VerificationRequest struct {
	LastName        string    `form:"last_name" validate:"required"`
	FirstName       string    `form:"first_name" validate:"required"`
	MiddleName      *string   `form:"middle_name"`
	BirthDate       string    `form:"birth_date" validate:"required"`
	PassportSeries  string    `form:"passport_series" validate:"required"`
	PassportNumber  string    `form:"passport_number" validate:"required"`
	PassportIssuer  string    `form:"passport_issuer" validate:"required"`
	PassportDate    string    `form:"passport_date" validate:"required"`
	DocType         string    `form:"doc_type" validate:"required,oneof=inn snils"`
	INN             *string   `form:"inn"`
	SNILS           *string   `form:"snils"`
	Consent1        bool      `form:"consent1"`
	Consent2        bool      `form:"consent2"`
	Consent3        bool      `form:"consent3"`
}

// UpdateVerificationRequest запрос на обновление статуса верификации
type UpdateVerificationRequest struct {
	Status         string  `json:"status" validate:"required,oneof=approved rejected"`
	RejectionReason *string `json:"rejection_reason,omitempty"`
}

// CreatePostRequest запрос на создание поста
type CreatePostRequest struct {
	Title       string  `form:"title" validate:"required"`
	Description string  `form:"description" validate:"required"`
	Amount      float64 `form:"amount" validate:"required,gt=0"`
	Recipient   string  `form:"recipient" validate:"required"`
	Bank        string  `form:"bank" validate:"required"`
	Phone       string  `form:"phone" validate:"required"`
}

// UpdatePostRequest запрос на обновление поста
type UpdatePostRequest struct {
	Title       *string  `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Amount      *float64 `json:"amount,omitempty" validate:"omitempty,gt=0"`
	Recipient   *string  `json:"recipient,omitempty"`
	Bank        *string  `json:"bank,omitempty"`
	Phone       *string  `json:"phone,omitempty"`
}

// CreateDonationRequest запрос на создание пожертвования
type CreateDonationRequest struct {
	PostID  int64   `form:"post_id" validate:"required"`
	Amount  float64 `form:"amount" validate:"required,gt=0"`
}

// UpdateDonationRequest запрос на обновление статуса пожертвования
type UpdateDonationRequest struct {
	Status string `json:"status" validate:"required,oneof=confirmed rejected"`
}

// CreateChatRequest запрос на создание чата
type CreateChatRequest struct {
	PostID int64 `json:"post_id" validate:"required"`
}

// SendMessageRequest запрос на отправку сообщения
type SendMessageRequest struct {
	Text *string `form:"text"`
}

// MarkMessagesReadRequest запрос на отметку сообщений как прочитанных
type MarkMessagesReadRequest struct {
	MessageIDs []int64 `json:"message_ids,omitempty"`
}

// UpdateMessageRequest запрос на обновление сообщения
type UpdateMessageRequest struct {
	Text string `json:"text" validate:"required"`
}

// PresignedURLRequest запрос на получение presigned URL
type PresignedURLRequest struct {
	Bucket      string `json:"bucket" validate:"required"`
	ObjectKey   string `json:"object_key" validate:"required"`
	ContentType string `json:"content_type" validate:"required"`
	ExpiresIn   int    `json:"expires_in" validate:"omitempty,min=1,max=604800"` // max 7 days
}

// PresignedURLResponse ответ с presigned URL
type PresignedURLResponse struct {
	UploadURL  string    `json:"upload_url"`
	ObjectURL  string    `json:"object_url"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// PresignedGetURLRequest запрос на получение presigned URL для чтения
type PresignedGetURLRequest struct {
	Bucket    string `json:"bucket" validate:"required"`
	ObjectKey string `json:"object_key" validate:"required"`
	ExpiresIn int    `json:"expires_in" validate:"omitempty,min=1,max=604800"` // max 7 days
}

// PresignedGetURLResponse ответ с presigned URL для чтения
type PresignedGetURLResponse struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// PaginationRequest параметры пагинации
type PaginationRequest struct {
	Page  int `json:"page" validate:"omitempty,min=1"`
	Limit int `json:"limit" validate:"omitempty,min=1,max=100"`
}

// PaginationResponse ответ с пагинацией
type PaginationResponse struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// PostWithDetails пост с деталями (автор, медиа)
type PostWithDetails struct {
	Post
	Author *UserInfo      `json:"author,omitempty"`
	Media  []PostMedia    `json:"media,omitempty"`
}

// UserInfo краткая информация о пользователе
type UserInfo struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Avatar *string `json:"avatar,omitempty"`
}

// DonationWithDetails пожертвование с деталями
type DonationWithDetails struct {
	Donation
	Donor *UserInfo `json:"donor,omitempty"`
	Post  *PostInfo `json:"post,omitempty"`
}

// PostInfo краткая информация о посте
type PostInfo struct {
	ID       int64   `json:"id"`
	Title    string  `json:"title"`
	Amount   float64 `json:"amount"`
	Collected float64 `json:"collected"`
}

// ChatWithDetails чат с деталями
type ChatWithDetails struct {
	Chat
	Post        *PostWithDetails `json:"post,omitempty"`
	Interlocutor *UserInfo       `json:"interlocutor,omitempty"`
	LastMessage *Message         `json:"last_message,omitempty"`
	UnreadCount int             `json:"unread_count"`
}

// MessageWithDetails сообщение с деталями
type MessageWithDetails struct {
	Message
	Sender *UserInfo `json:"sender,omitempty"`
}

// RatingWithDetails рейтинг с деталями
type RatingWithDetails struct {
	Rating
	User     *UserInfo `json:"user,omitempty"`
	Position int       `json:"position"`
}

// HealthCheckResponse ответ health check
type HealthCheckResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Database  string                 `json:"database"`
	MinIO     string                 `json:"minio"`
}

// VerificationResponse ответ верификации
type VerificationResponse struct {
	ID             int64      `json:"id"`
	UserID         int64      `json:"user_id"`
	Status         string     `json:"status"`
	SubmittedAt    time.Time  `json:"submitted_at"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy     *int64     `json:"reviewed_by,omitempty"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	Message        string     `json:"message,omitempty"`
}

// VerificationsListResponse список верификаций
type VerificationsListResponse struct {
	Data       []Verification   `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}

// PostsListResponse список постов
type PostsListResponse struct {
	Data       []PostWithDetails `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}

// PostResponse ответ поста
type PostResponse struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	Title      string    `json:"title"`
	Description string   `json:"description"`
	Amount     float64   `json:"amount"`
	Collected  float64   `json:"collected"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty"`
}

// PostUpdateResponse ответ обновления поста
type PostUpdateResponse struct {
	ID        int64      `json:"id"`
	Title     string     `json:"title"`
	UpdatedAt *time.Time `json:"updated_at"`
}

// DonationResponse ответ пожертвования
type DonationResponse struct {
	ID          int64      `json:"id"`
	PostID      int64      `json:"post_id"`
	DonorID     int64      `json:"donor_id"`
	Amount      float64    `json:"amount"`
	ReceiptURL  *string    `json:"receipt_url,omitempty"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
}

// DonationsListResponse список пожертвований
type DonationsListResponse struct {
	Data       []DonationWithDetails `json:"data"`
	Pagination PaginationResponse     `json:"pagination"`
}

// DonationUpdateResponse ответ обновления пожертвования
type DonationUpdateResponse struct {
	ID          int64      `json:"id"`
	Status      string     `json:"status"`
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty"`
	ConfirmedBy *int64    `json:"confirmed_by,omitempty"`
}

// ChatResponse ответ чата
type ChatResponse struct {
	ID        int64     `json:"id"`
	PostID    int64     `json:"post_id"`
	HelperID  int64     `json:"helper_id"`
	NeedyID   int64     `json:"needy_id"`
	CreatedAt time.Time `json:"created_at"`
}

// ChatsListResponse список чатов
type ChatsListResponse struct {
	Data []ChatWithDetails `json:"data"`
}

// MessagesListResponse список сообщений
type MessagesListResponse struct {
	Data       []MessageWithDetails `json:"data"`
	Pagination PaginationResponse    `json:"pagination"`
}

// MessageResponse ответ сообщения
type MessageResponse struct {
	ID           int64      `json:"id"`
	ChatID       int64      `json:"chat_id"`
	SenderID     int64      `json:"sender_id"`
	Text         *string    `json:"text,omitempty"`
	AttachmentURL *string   `json:"attachment_url,omitempty"`
	IsRead       bool       `json:"is_read"`
	IsEdited     bool       `json:"is_edited"`
	CreatedAt    time.Time  `json:"created_at"`
}

// MessageUpdateResponse ответ обновления сообщения
type MessageUpdateResponse struct {
	ID        int64     `json:"id"`
	Text      string    `json:"text"`
	IsEdited  bool      `json:"is_edited"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MarkMessagesReadResponse ответ отметки сообщений
type MarkMessagesReadResponse struct {
	UpdatedCount int    `json:"updated_count"`
	Message      string `json:"message"`
}

// RatingsListResponse список рейтингов
type RatingsListResponse struct {
	Data       []RatingWithDetails `json:"data"`
	Pagination PaginationResponse  `json:"pagination"`
}

// PhotoUploadResponse ответ загрузки фото
type PhotoUploadResponse struct {
	PhotoURL string `json:"photo_url"`
}

// SuccessResponse успешный ответ
type SuccessResponse struct {
	Message string `json:"message"`
}

// ErrorResponse формат ответа об ошибке
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail детали ошибки
type ErrorDetail struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// Helper functions для работы с NULL значениями

// NullStringToPtr конвертирует sql.NullString в *string
func NullStringToPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// PtrToNullString конвертирует *string в sql.NullString
func PtrToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}

// NullInt64ToPtr конвертирует sql.NullInt64 в *int64
func NullInt64ToPtr(ni sql.NullInt64) *int64 {
	if ni.Valid {
		return &ni.Int64
	}
	return nil
}

// PtrToNullInt64 конвертирует *int64 в sql.NullInt64
func PtrToNullInt64(i *int64) sql.NullInt64 {
	if i == nil {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: *i, Valid: true}
}

// NullTimeToPtr конвертирует sql.NullTime в *time.Time
func NullTimeToPtr(nt sql.NullTime) *time.Time {
	if nt.Valid {
		return &nt.Time
	}
	return nil
}

// PtrToNullTime конвертирует *time.Time в sql.NullTime
func PtrToNullTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{Valid: false}
	}
	return sql.NullTime{Time: *t, Valid: true}
}
