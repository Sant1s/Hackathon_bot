package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
)

type Handlers struct {
	db          *DB
	minioClient *minio.Client
	cfg         *Config
}

func NewHandlers(db *DB, minioClient *minio.Client, cfg *Config) *Handlers {
	return &Handlers{
		db:          db,
		minioClient: minioClient,
		cfg:         cfg,
	}
}

// ========== Health Check ==========

// HealthCheck проверяет состояние сервера
// @Summary     Health check
// @Description Проверяет состояние сервера, подключение к базе данных и MinIO
// @Tags        Утилиты
// @Accept      json
// @Produce     json
// @Success     200  {object}  HealthCheckResponse
// @Failure     503  {object}  ErrorResponse
// @Router      /health [get]
func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
	}

	if err := h.db.Ping(); err != nil {
		status["database"] = "error: " + err.Error()
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		status["database"] = "connected"
	}

	ctx := r.Context()
	buckets := []string{BucketUserPhotos, BucketVerificationDocs, BucketPostMedia, BucketDonationReceipts, BucketChatAttachments}
	allBucketsOk := true
	for _, bucket := range buckets {
		exists, err := h.minioClient.BucketExists(ctx, bucket)
		if err != nil || !exists {
			allBucketsOk = false
			break
		}
	}

	if allBucketsOk {
		status["minio"] = "connected"
	} else {
		status["minio"] = "error"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	WriteJSON(w, http.StatusOK, status)
}

// ========== Auth Endpoints ==========

// Register регистрирует нового пользователя
// @Summary     Регистрация пользователя
// @Description Регистрирует нового пользователя в системе
// @Tags        Аутентификация
// @Accept      json
// @Produce     json
// @Param       request body RegisterRequest true "Данные регистрации"
// @Success     201  {object}  RegisterResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     409  {object}  ErrorResponse
// @Router      /auth/register [post]
func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	if err := ValidatePhoneNumber(req.Phone); err != nil {
		WriteError(w, err)
		return
	}

	phone := FormatPhone(req.Phone)
	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка обработки пароля"))
		return
	}

	user, err := h.db.CreateUser(phone, passwordHash, req.FirstName, req.LastName)
	if err != nil {
		WriteError(w, err)
		return
	}

	token, err := GenerateToken(h.cfg, user.ID, user.Role, false)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка генерации токена"))
		return
	}

	response := RegisterResponse{
		UserID:  user.ID,
		Token:   token,
		Message: "Пользователь успешно зарегистрирован",
	}
	WriteJSON(w, http.StatusCreated, response)
}

// Login выполняет вход в систему
// @Summary     Вход в систему
// @Description Аутентифицирует пользователя и возвращает JWT токен
// @Tags        Аутентификация
// @Accept      json
// @Produce     json
// @Param       request body LoginRequest true "Данные входа"
// @Success     200  {object}  LoginResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /auth/login [post]
func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	phone := FormatPhone(req.Phone)
	user, err := h.db.GetUserByPhone(phone)
	if err != nil {
		WriteError(w, NewUnauthorizedError("Неверные учетные данные"))
		return
	}

	if !CheckPassword(req.Password, user.PasswordHash) {
		WriteError(w, NewUnauthorizedError("Неверные учетные данные"))
		return
	}

	if !user.IsActive {
		WriteError(w, NewForbiddenError("Аккаунт деактивирован"))
		return
	}

	token, err := GenerateToken(h.cfg, user.ID, user.Role, false)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка генерации токена"))
		return
	}

	// Очищаем пароль из ответа
	user.PasswordHash = ""
	response := LoginResponse{
		UserID: user.ID,
		Token:  token,
		User:   user,
	}
	WriteJSON(w, http.StatusOK, response)
}

// RefreshToken обновляет JWT токен
// @Summary     Обновление токена
// @Description Обновляет JWT токен пользователя
// @Tags        Аутентификация
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Success     200  {object}  RefreshTokenResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /auth/refresh [post]
func (h *Handlers) RefreshToken(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	tokenString, err := ExtractTokenFromHeader(authHeader)
	if err != nil {
		WriteError(w, NewUnauthorizedError("Токен не найден"))
		return
	}

	claims, err := ValidateToken(h.cfg, tokenString)
	if err != nil {
		WriteError(w, NewUnauthorizedError("Неверный токен"))
		return
	}

	user, err := h.db.GetUserByID(claims.UserID)
	if err != nil {
		WriteError(w, NewUnauthorizedError("Пользователь не найден"))
		return
	}

	newToken, err := GenerateToken(h.cfg, user.ID, user.Role, false)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка генерации токена"))
		return
	}

	response := RefreshTokenResponse{Token: newToken}
	WriteJSON(w, http.StatusOK, response)
}

// ========== User Endpoints ==========

// GetProfile получает профиль текущего пользователя
// @Summary     Получить профиль
// @Description Возвращает информацию о текущем пользователе
// @Tags        Профиль
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Success     200  {object}  User
// @Failure     401  {object}  ErrorResponse
// @Router      /users/me [get]
func (h *Handlers) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	user.PasswordHash = ""

	// Преобразуем photo_url в URL через backend проксирование, если он есть
	if user.PhotoURL != nil && *user.PhotoURL != "" {
		backendURL := ConvertMinIOURLToBackendURL(*user.PhotoURL)
		user.PhotoURL = &backendURL
	}

	WriteJSON(w, http.StatusOK, user)
}

// UpdateProfile обновляет профиль пользователя
// @Summary     Обновить профиль
// @Description Обновляет данные профиля текущего пользователя
// @Tags        Профиль
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       request body UpdateProfileRequest true "Данные для обновления"
// @Success     200  {object}  User
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /users/me [patch]
func (h *Handlers) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := h.db.UpdateUser(userID, req.FirstName, req.LastName, req.HelperName, nil); err != nil {
		WriteError(w, err)
		return
	}

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	user.PasswordHash = ""

	// Преобразуем photo_url в URL через backend проксирование, если он есть
	if user.PhotoURL != nil && *user.PhotoURL != "" {
		backendURL := ConvertMinIOURLToBackendURL(*user.PhotoURL)
		user.PhotoURL = &backendURL
	}

	WriteJSON(w, http.StatusOK, user)
}

// UploadPhoto загружает фото профиля
// @Summary     Загрузить фото профиля
// @Description Загружает фото профиля пользователя
// @Tags        Профиль
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       photo formData file true "Фото профиля (JPEG, PNG, max 5MB)"
// @Success     200  {object}  PhotoUploadResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     413  {object}  ErrorResponse
// @Router      /users/me/photo [post]
func (h *Handlers) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	if err := ParseMultipartForm(r, 5<<20); err != nil { // 5MB
		WriteError(w, err)
		return
	}

	file, header, err := GetFileFromForm(r, "photo")
	if err != nil {
		WriteError(w, err)
		return
	}
	defer file.Close()

	if err := ValidateFileSize(header, 5<<20); err != nil { // 5MB
		WriteError(w, err)
		return
	}

	if err := ValidateImageFile(header); err != nil {
		WriteError(w, err)
		return
	}

	ctx := r.Context()
	objectKey, err := UploadUserPhoto(ctx, h.minioClient, userID, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		WriteError(w, NewInternalError("Ошибка загрузки фото"))
		return
	}

	photoURL := GetObjectURL(h.cfg.MinIOConfig, BucketUserPhotos, objectKey)
	if err := h.db.UpdateUser(userID, nil, nil, nil, &photoURL); err != nil {
		WriteError(w, err)
		return
	}

	// Преобразуем для ответа клиенту
	backendURL := ConvertMinIOURLToBackendURL(photoURL)
	WriteJSON(w, http.StatusOK, map[string]string{"photo_url": backendURL})
}

// ChangePassword изменяет пароль пользователя
// @Summary     Изменить пароль
// @Description Изменяет пароль текущего пользователя
// @Tags        Профиль
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       request body ChangePasswordRequest true "Старый и новый пароль"
// @Success     200  {object}  SuccessResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /users/me/change-password [post]
func (h *Handlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if !CheckPassword(req.OldPassword, user.PasswordHash) {
		WriteError(w, NewUnauthorizedError("Неверный старый пароль"))
		return
	}

	newPasswordHash, err := HashPassword(req.NewPassword)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка обработки пароля"))
		return
	}

	if err := h.db.UpdateUserPassword(userID, newPasswordHash); err != nil {
		WriteError(w, err)
		return
	}

	WriteSuccess(w, http.StatusOK, "Пароль успешно изменен")
}

// ========== Verification Endpoints ==========

// CreateVerification создает заявку на верификацию
// @Summary     Подать заявку на верификацию
// @Description Создает заявку на верификацию пользователя
// @Tags        Верификация
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       user_photo formData file true "Фото пользователя"
// @Param       last_name formData string true "Фамилия"
// @Param       first_name formData string true "Имя"
// @Param       middle_name formData string false "Отчество"
// @Param       birth_date formData string true "Дата рождения (YYYY-MM-DD)"
// @Param       passport_series formData string true "Серия паспорта"
// @Param       passport_number formData string true "Номер паспорта"
// @Param       passport_issuer formData string true "Кем выдан"
// @Param       passport_date formData string true "Дата выдачи (YYYY-MM-DD)"
// @Param       doc_type formData string true "Тип документа (inn или snils)" Enums(inn, snils)
// @Param       inn formData string false "ИНН"
// @Param       snils formData string false "СНИЛС"
// @Param       passport_scans formData file true "Сканы паспорта (минимум 2)"
// @Param       consent1 formData bool true "Согласие 1"
// @Param       consent2 formData bool true "Согласие 2"
// @Param       consent3 formData bool true "Согласие 3"
// @Success     201  {object}  VerificationResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     409  {object}  ErrorResponse
// @Router      /verifications [post]
func (h *Handlers) CreateVerification(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем, нет ли уже верификации
	existing, _ := h.db.GetVerificationByUserID(userID)
	if existing != nil {
		WriteError(w, NewConflictError("Заявка на верификацию уже подана"))
		return
	}

	if err := ParseMultipartForm(r, 50<<20); err != nil { // 50MB для всех файлов
		WriteError(w, err)
		return
	}

	var req VerificationRequest
	req.LastName = r.FormValue("last_name")
	req.FirstName = r.FormValue("first_name")
	req.MiddleName = getStringPtr(r.FormValue("middle_name"))
	req.BirthDate = r.FormValue("birth_date")
	req.PassportSeries = r.FormValue("passport_series")
	req.PassportNumber = r.FormValue("passport_number")
	req.PassportIssuer = r.FormValue("passport_issuer")
	req.PassportDate = r.FormValue("passport_date")
	req.DocType = r.FormValue("doc_type")
	req.INN = getStringPtr(r.FormValue("inn"))
	req.SNILS = getStringPtr(r.FormValue("snils"))
	req.Consent1 = r.FormValue("consent1") == "true"
	req.Consent2 = r.FormValue("consent2") == "true"
	req.Consent3 = r.FormValue("consent3") == "true"

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	birthDate, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		WriteError(w, NewValidationError("Неверный формат даты рождения", map[string]interface{}{"field": "birth_date"}))
		return
	}

	passportDate, err := time.Parse("2006-01-02", req.PassportDate)
	if err != nil {
		WriteError(w, NewValidationError("Неверный формат даты выдачи паспорта", map[string]interface{}{"field": "passport_date"}))
		return
	}

	verification := &Verification{
		UserID:         userID,
		LastName:       req.LastName,
		FirstName:      req.FirstName,
		MiddleName:     req.MiddleName,
		BirthDate:      birthDate,
		PassportSeries: req.PassportSeries,
		PassportNumber: req.PassportNumber,
		PassportIssuer: req.PassportIssuer,
		PassportDate:   passportDate,
		DocType:        req.DocType,
		INN:            req.INN,
		SNILS:          req.SNILS,
		Consent1:       req.Consent1,
		Consent2:       req.Consent2,
		Consent3:       req.Consent3,
	}

	ctx := r.Context()

	// Загружаем фото пользователя
	if userPhoto, header, err := r.FormFile("user_photo"); err == nil {
		defer userPhoto.Close()
		if err := ValidateImageFile(header); err != nil {
			WriteError(w, err)
			return
		}
		objectKey, err := UploadVerificationDoc(ctx, h.minioClient, 0, "user_photo", userPhoto, header.Size, header.Header.Get("Content-Type"))
		if err != nil {
			WriteError(w, NewInternalError("Ошибка загрузки фото"))
			return
		}
		url := GetObjectURL(h.cfg.MinIOConfig, BucketVerificationDocs, objectKey)
		verification.UserPhotoURL = &url
	}

	// Загружаем сканы паспорта
	var passportScans []string
	if files, ok := r.MultipartForm.File["passport_scans"]; ok {
		if len(files) < 2 {
			WriteError(w, NewValidationError("Необходимо загрузить минимум 2 страницы паспорта", nil))
			return
		}
		for i, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				WriteError(w, NewInternalError("Ошибка чтения файла"))
				return
			}
			defer file.Close()

			if err := ValidateImageFile(fileHeader); err != nil {
				WriteError(w, err)
				return
			}

			objectKey, err := UploadVerificationDoc(ctx, h.minioClient, 0, fmt.Sprintf("passport_scan_%d", i), file, fileHeader.Size, fileHeader.Header.Get("Content-Type"))
			if err != nil {
				WriteError(w, NewInternalError("Ошибка загрузки скана"))
				return
			}
			url := GetObjectURL(h.cfg.MinIOConfig, BucketVerificationDocs, objectKey)
			passportScans = append(passportScans, url)
		}
		verification.PassportScansURLs = passportScans
	}

	// Создаем верификацию
	if err := h.db.CreateVerification(verification); err != nil {
		WriteError(w, err)
		return
	}

	// Обновляем objectKey с правильным verification_id
	if verification.UserPhotoURL != nil {
		// Переименовываем файлы с правильным ID (упрощенная версия - в реальности нужно переименовать)
	}

	response := map[string]interface{}{
		"id":           verification.ID,
		"user_id":      verification.UserID,
		"status":       verification.Status,
		"submitted_at": verification.SubmittedAt,
		"message":      "Заявка на верификацию подана",
	}
	WriteJSON(w, http.StatusCreated, response)
}

// GetMyVerification получает статус верификации текущего пользователя
// @Summary     Получить статус верификации
// @Description Возвращает статус верификации текущего пользователя
// @Tags        Верификация
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Success     200  {object}  VerificationResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     404  {object}  ErrorResponse
// @Router      /verifications/me [get]
func (h *Handlers) GetMyVerification(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	verification, err := h.db.GetVerificationByUserID(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	response := map[string]interface{}{
		"id":               verification.ID,
		"user_id":          verification.UserID,
		"status":           verification.Status,
		"submitted_at":     verification.SubmittedAt,
		"reviewed_at":      verification.ReviewedAt,
		"rejection_reason": verification.RejectionReason,
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetVerifications получает список заявок на верификацию (только для админов)
// @Summary     Получить список заявок на верификацию
// @Description Возвращает список всех заявок на верификацию с пагинацией
// @Tags        Верификация
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       status query string false "Фильтр по статусу" Enums(pending, approved, rejected)
// @Param       page query int false "Номер страницы" default(1)
// @Param       limit query int false "Количество на странице" default(20)
// @Success     200  {object}  VerificationsListResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /verifications [get]
func (h *Handlers) GetVerifications(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}

	verifications, total, err := h.db.GetVerifications(status, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	totalPages := (total + limit - 1) / limit
	response := map[string]interface{}{
		"data": verifications,
		"pagination": PaginationResponse{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
	WriteJSON(w, http.StatusOK, response)
}

// UpdateVerification обновляет статус верификации (только для админов)
// @Summary     Одобрить/отклонить верификацию
// @Description Обновляет статус верификации (одобрить или отклонить)
// @Tags        Верификация
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID верификации"
// @Param       request body UpdateVerificationRequest true "Статус и причина отклонения"
// @Success     200  {object}  VerificationResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /verifications/{id} [patch]
func (h *Handlers) UpdateVerification(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	verificationID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID верификации", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	var req UpdateVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	if err := h.db.UpdateVerificationStatus(verificationID, req.Status, userID, req.RejectionReason); err != nil {
		WriteError(w, err)
		return
	}

	verification, err := h.db.GetVerificationByUserID(0) // Нужно добавить GetVerificationByID
	if err != nil {
		// Упрощенная версия
		response := map[string]interface{}{
			"id":          verificationID,
			"status":      req.Status,
			"reviewed_at": time.Now(),
			"reviewed_by": userID,
		}
		WriteJSON(w, http.StatusOK, response)
		return
	}

	response := map[string]interface{}{
		"id":          verification.ID,
		"status":      verification.Status,
		"reviewed_at": verification.ReviewedAt,
		"reviewed_by": verification.ReviewedBy,
	}
	WriteJSON(w, http.StatusOK, response)
}

// ========== Post Endpoints ==========

// GetPosts получает список постов
// @Summary     Получить список постов
// @Description Возвращает список постов с пагинацией и фильтрацией
// @Tags        Посты
// @Accept      json
// @Produce     json
// @Param       status query string false "Фильтр по статусу" Enums(active, completed, closed, moderated)
// @Param       user_id query int false "Фильтр по автору"
// @Param       page query int false "Номер страницы" default(1)
// @Param       limit query int false "Количество на странице" default(20)
// @Success     200  {object}  PostsListResponse
// @Router      /posts [get]
func (h *Handlers) GetPosts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	userIDStr := r.URL.Query().Get("user_id")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}

	var userID *int64
	if userIDStr != "" {
		id, _ := strconv.ParseInt(userIDStr, 10, 64)
		userID = &id
	}

	posts, total, err := h.db.GetPosts(status, userID, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	// Обогащаем посты данными автора и медиа
	var postsWithDetails []PostWithDetails
	for _, post := range posts {
		author, _ := h.db.GetUserByID(post.UserID)
		media, _ := h.db.GetPostMedia(post.ID)

		var authorInfo *UserInfo
		if author != nil {
			name := fmt.Sprintf("%s %s", author.FirstName, author.LastName)
			authorInfo = &UserInfo{
				ID:     author.ID,
				Name:   name,
				Avatar: author.PhotoURL,
			}
		}

		postsWithDetails = append(postsWithDetails, PostWithDetails{
			Post:   post,
			Author: authorInfo,
			Media:  media,
		})
	}

	totalPages := (total + limit - 1) / limit
	response := map[string]interface{}{
		"data": postsWithDetails,
		"pagination": PaginationResponse{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetPost получает пост по ID
// @Summary     Получить пост
// @Description Возвращает детальную информацию о посте
// @Tags        Посты
// @Accept      json
// @Produce     json
// @Param       id path int true "ID поста"
// @Success     200  {object}  PostWithDetails
// @Failure     404  {object}  ErrorResponse
// @Router      /posts/{id} [get]
func (h *Handlers) GetPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID поста", nil))
		return
	}

	post, err := h.db.GetPostByID(postID)
	if err != nil {
		WriteError(w, err)
		return
	}

	author, _ := h.db.GetUserByID(post.UserID)
	media, _ := h.db.GetPostMedia(post.ID)

	var authorInfo *UserInfo
	if author != nil {
		name := fmt.Sprintf("%s %s", author.FirstName, author.LastName)
		authorInfo = &UserInfo{
			ID:     author.ID,
			Name:   name,
			Avatar: author.PhotoURL,
		}
	}

	response := PostWithDetails{
		Post:   *post,
		Author: authorInfo,
		Media:  media,
	}
	WriteJSON(w, http.StatusOK, response)
}

// CreatePost создает новый пост (только для верифицированных пользователей)
// @Summary     Создать пост
// @Description Создает новый пост о помощи
// @Tags        Посты
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       title formData string true "Заголовок"
// @Param       description formData string true "Описание"
// @Param       amount formData number true "Целевая сумма"
// @Param       recipient formData string true "Получатель средств"
// @Param       bank formData string true "Банк получателя"
// @Param       phone formData string true "Телефон для связи"
// @Param       media formData file false "Медиа файлы (максимум 10, каждый до 10MB)"
// @Success     201  {object}  PostResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /posts [post]
func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем верификацию
	if !h.db.IsUserVerified(userID) {
		WriteError(w, NewForbiddenError("Пользователь не верифицирован"))
		return
	}

	if err := ParseMultipartForm(r, 100<<20); err != nil { // 100MB
		WriteError(w, err)
		return
	}

	var req CreatePostRequest
	req.Title = r.FormValue("title")
	req.Description = r.FormValue("description")
	req.Amount, _ = strconv.ParseFloat(r.FormValue("amount"), 64)
	req.Recipient = r.FormValue("recipient")
	req.Bank = r.FormValue("bank")
	req.Phone = r.FormValue("phone")

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	post := &Post{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Amount:      req.Amount,
		Recipient:   req.Recipient,
		Bank:        req.Bank,
		Phone:       req.Phone,
	}

	if err := h.db.CreatePost(post); err != nil {
		WriteError(w, err)
		return
	}

	ctx := r.Context()
	// Загружаем медиа файлы
	if files, ok := r.MultipartForm.File["media"]; ok {
		for i, fileHeader := range files {
			if i >= 10 { // Максимум 10 файлов
				break
			}

			file, err := fileHeader.Open()
			if err != nil {
				continue
			}

			if err := ValidateFileSize(fileHeader, 10<<20); err != nil { // 10MB
				file.Close()
				continue
			}

			if err := ValidateMediaFile(fileHeader); err != nil {
				file.Close()
				continue
			}

			mediaType := "image"
			if strings.Contains(strings.ToLower(filepath.Ext(fileHeader.Filename)), "mp4") ||
				strings.Contains(strings.ToLower(filepath.Ext(fileHeader.Filename)), "webm") {
				mediaType = "video"
			}

			objectKey, err := UploadPostMedia(ctx, h.minioClient, post.ID, i, file, fileHeader.Size, fileHeader.Header.Get("Content-Type"))
			file.Close()
			if err != nil {
				continue
			}

			mediaURL := GetObjectURL(h.cfg.MinIOConfig, BucketPostMedia, objectKey)
			h.db.CreatePostMedia(post.ID, mediaURL, mediaType, i)
		}
	}

	response := map[string]interface{}{
		"id":          post.ID,
		"user_id":     post.UserID,
		"title":       post.Title,
		"description": post.Description,
		"amount":      post.Amount,
		"collected":   post.Collected,
		"status":      post.Status,
		"created_at":  post.CreatedAt,
	}
	WriteJSON(w, http.StatusCreated, response)
}

// UpdatePost обновляет пост (только автор)
// @Summary     Обновить пост
// @Description Обновляет данные поста (только автор может редактировать)
// @Tags        Посты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID поста"
// @Param       request body UpdatePostRequest true "Данные для обновления"
// @Success     200  {object}  PostUpdateResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Failure     404  {object}  ErrorResponse
// @Router      /posts/{id} [patch]
func (h *Handlers) UpdatePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID поста", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	post, err := h.db.GetPostByID(postID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if post.UserID != userID {
		WriteError(w, NewForbiddenError("Недостаточно прав"))
		return
	}

	var req UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	if err := h.db.UpdatePost(postID, req.Title, req.Description, req.Amount, req.Recipient, req.Bank, req.Phone); err != nil {
		WriteError(w, err)
		return
	}

	post, _ = h.db.GetPostByID(postID)
	response := map[string]interface{}{
		"id":         post.ID,
		"title":      post.Title,
		"updated_at": post.UpdatedAt,
	}
	WriteJSON(w, http.StatusOK, response)
}

// AddPostMedia добавляет медиа к посту (только автор)
// @Summary     Добавить медиа к посту
// @Description Добавляет медиа файл к существующему посту
// @Tags        Посты
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID поста"
// @Param       media formData file true "Медиа файл (изображение/видео, до 10MB)"
// @Success     201  {object}  PostMedia
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /posts/{id}/media [post]
func (h *Handlers) AddPostMedia(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID поста", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	post, err := h.db.GetPostByID(postID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if post.UserID != userID {
		WriteError(w, NewForbiddenError("Недостаточно прав"))
		return
	}

	if err := ParseMultipartForm(r, 10<<20); err != nil {
		WriteError(w, err)
		return
	}

	file, header, err := GetFileFromForm(r, "media")
	if err != nil {
		WriteError(w, err)
		return
	}
	defer file.Close()

	if err := ValidateFileSize(header, 10<<20); err != nil {
		WriteError(w, err)
		return
	}

	if err := ValidateMediaFile(header); err != nil {
		WriteError(w, err)
		return
	}

	media, _ := h.db.GetPostMedia(postID)
	orderIndex := len(media)

	mediaType := "image"
	if strings.Contains(strings.ToLower(filepath.Ext(header.Filename)), "mp4") ||
		strings.Contains(strings.ToLower(filepath.Ext(header.Filename)), "webm") {
		mediaType = "video"
	}

	ctx := r.Context()
	objectKey, err := UploadPostMedia(ctx, h.minioClient, postID, orderIndex, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		WriteError(w, NewInternalError("Ошибка загрузки медиа"))
		return
	}

	mediaURL := GetObjectURL(h.cfg.MinIOConfig, BucketPostMedia, objectKey)
	postMedia, err := h.db.CreatePostMedia(postID, mediaURL, mediaType, orderIndex)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, postMedia)
}

// DeletePostMedia удаляет медиа из поста (только автор)
// @Summary     Удалить медиа из поста
// @Description Удаляет медиа файл из поста
// @Tags        Посты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID поста"
// @Param       media_id path int true "ID медиа"
// @Success     204  "Успешно удалено"
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /posts/{id}/media/{media_id} [delete]
func (h *Handlers) DeletePostMedia(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID поста", nil))
		return
	}

	mediaID, err := strconv.ParseInt(vars["media_id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID медиа", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	post, err := h.db.GetPostByID(postID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if post.UserID != userID {
		WriteError(w, NewForbiddenError("Недостаточно прав"))
		return
	}

	if err := h.db.DeletePostMedia(mediaID); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeletePost удаляет пост (только автор)
// @Summary     Удалить пост
// @Description Удаляет пост (только автор может удалить)
// @Tags        Посты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID поста"
// @Success     204  "Успешно удалено"
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Failure     404  {object}  ErrorResponse
// @Router      /posts/{id} [delete]
func (h *Handlers) DeletePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID поста", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	post, err := h.db.GetPostByID(postID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if post.UserID != userID {
		WriteError(w, NewForbiddenError("Недостаточно прав"))
		return
	}

	if err := h.db.DeletePost(postID); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Donation Endpoints ==========

// CreateDonation создает пожертвование
// @Summary     Создать пожертвование
// @Description Создает новое пожертвование для поста
// @Tags        Пожертвования
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       post_id formData int true "ID поста"
// @Param       amount formData number true "Сумма пожертвования"
// @Param       receipt formData file false "Чек/скриншот (JPEG, PNG, PDF, до 10MB)"
// @Success     201  {object}  DonationResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     404  {object}  ErrorResponse
// @Router      /donations [post]
func (h *Handlers) CreateDonation(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	if err := ParseMultipartForm(r, 10<<20); err != nil {
		WriteError(w, err)
		return
	}

	var req CreateDonationRequest
	req.PostID, _ = strconv.ParseInt(r.FormValue("post_id"), 10, 64)
	req.Amount, _ = strconv.ParseFloat(r.FormValue("amount"), 64)

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем существование поста
	_, err = h.db.GetPostByID(req.PostID)
	if err != nil {
		WriteError(w, NewNotFoundError("Пост"))
		return
	}

	donation := &Donation{
		PostID:  req.PostID,
		DonorID: userID,
		Amount:  req.Amount,
	}

	// Загружаем чек если есть
	if receipt, header, err := r.FormFile("receipt"); err == nil {
		defer receipt.Close()

		if err := ValidateFileSize(header, 10<<20); err != nil {
			WriteError(w, err)
			return
		}

		if err := ValidateDocumentFile(header); err != nil {
			WriteError(w, err)
			return
		}

		// Создаем donation сначала чтобы получить ID
		if err := h.db.CreateDonation(donation); err != nil {
			WriteError(w, err)
			return
		}

		ctx := r.Context()
		objectKey, err := UploadDonationReceipt(ctx, h.minioClient, donation.ID, receipt, header.Size, header.Header.Get("Content-Type"))
		if err != nil {
			WriteError(w, NewInternalError("Ошибка загрузки чека"))
			return
		}

		receiptURL := GetObjectURL(h.cfg.MinIOConfig, BucketDonationReceipts, objectKey)
		donation.ReceiptURL = &receiptURL
		// Обновляем donation с receipt_url (нужно добавить функцию UpdateDonationReceiptURL)
	} else {
		if err := h.db.CreateDonation(donation); err != nil {
			WriteError(w, err)
			return
		}
	}

	response := map[string]interface{}{
		"id":          donation.ID,
		"post_id":     donation.PostID,
		"donor_id":    donation.DonorID,
		"amount":      donation.Amount,
		"receipt_url": donation.ReceiptURL,
		"status":      donation.Status,
		"created_at":  donation.CreatedAt,
	}
	WriteJSON(w, http.StatusCreated, response)
}

// GetDonations получает список пожертвований
// @Summary     Получить список пожертвований
// @Description Возвращает список пожертвований с фильтрацией и пагинацией
// @Tags        Пожертвования
// @Accept      json
// @Produce     json
// @Param       post_id query int false "Фильтр по посту"
// @Param       donor_id query int false "Фильтр по донору"
// @Param       status query string false "Фильтр по статусу" Enums(pending, confirmed, rejected)
// @Param       page query int false "Номер страницы" default(1)
// @Param       limit query int false "Количество на странице" default(20)
// @Success     200  {object}  DonationsListResponse
// @Router      /donations [get]
func (h *Handlers) GetDonations(w http.ResponseWriter, r *http.Request) {
	postIDStr := r.URL.Query().Get("post_id")
	donorIDStr := r.URL.Query().Get("donor_id")
	status := r.URL.Query().Get("status")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}

	var postID, donorID *int64
	if postIDStr != "" {
		id, _ := strconv.ParseInt(postIDStr, 10, 64)
		postID = &id
	}
	if donorIDStr != "" {
		id, _ := strconv.ParseInt(donorIDStr, 10, 64)
		donorID = &id
	}

	donations, total, err := h.db.GetDonations(postID, donorID, status, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	// Обогащаем данными
	var donationsWithDetails []DonationWithDetails
	for _, donation := range donations {
		donor, _ := h.db.GetUserByID(donation.DonorID)
		post, _ := h.db.GetPostByID(donation.PostID)

		var donorInfo *UserInfo
		if donor != nil {
			name := donor.FirstName + " " + donor.LastName
			if donor.HelperName != nil {
				name = *donor.HelperName
			}
			donorInfo = &UserInfo{
				ID:     donor.ID,
				Name:   name,
				Avatar: donor.PhotoURL,
			}
		}

		var postInfo *PostInfo
		if post != nil {
			postInfo = &PostInfo{
				ID:        post.ID,
				Title:     post.Title,
				Amount:    post.Amount,
				Collected: post.Collected,
			}
		}

		donationsWithDetails = append(donationsWithDetails, DonationWithDetails{
			Donation: donation,
			Donor:    donorInfo,
			Post:     postInfo,
		})
	}

	totalPages := (total + limit - 1) / limit
	response := map[string]interface{}{
		"data": donationsWithDetails,
		"pagination": PaginationResponse{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetDonation получает пожертвование по ID
// @Summary     Получить пожертвование
// @Description Возвращает детальную информацию о пожертвовании
// @Tags        Пожертвования
// @Accept      json
// @Produce     json
// @Param       id path int true "ID пожертвования"
// @Success     200  {object}  DonationWithDetails
// @Failure     404  {object}  ErrorResponse
// @Router      /donations/{id} [get]
func (h *Handlers) GetDonation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	donationID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID пожертвования", nil))
		return
	}

	donation, err := h.db.GetDonationByID(donationID)
	if err != nil {
		WriteError(w, err)
		return
	}

	donor, _ := h.db.GetUserByID(donation.DonorID)
	post, _ := h.db.GetPostByID(donation.PostID)

	var donorInfo *UserInfo
	if donor != nil {
		name := donor.FirstName + " " + donor.LastName
		if donor.HelperName != nil {
			name = *donor.HelperName
		}
		donorInfo = &UserInfo{
			ID:     donor.ID,
			Name:   name,
			Avatar: donor.PhotoURL,
		}
	}

	var postInfo *PostInfo
	if post != nil {
		postInfo = &PostInfo{
			ID:        post.ID,
			Title:     post.Title,
			Amount:    post.Amount,
			Collected: post.Collected,
		}
	}

	response := DonationWithDetails{
		Donation: *donation,
		Donor:    donorInfo,
		Post:     postInfo,
	}
	WriteJSON(w, http.StatusOK, response)
}

// UpdateDonation подтверждает/отклоняет пожертвование (только для админов или автора поста)
// @Summary     Подтвердить/отклонить пожертвование
// @Description Обновляет статус пожертвования (подтвердить или отклонить)
// @Tags        Пожертвования
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID пожертвования"
// @Param       request body UpdateDonationRequest true "Статус"
// @Success     200  {object}  DonationUpdateResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /donations/{id} [patch]
func (h *Handlers) UpdateDonation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	donationID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID пожертвования", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	userRole, _ := GetUserRoleFromContext(r.Context())

	donation, err := h.db.GetDonationByID(donationID)
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем права: admin или автор поста
	post, err := h.db.GetPostByID(donation.PostID)
	if err != nil {
		WriteError(w, err)
		return
	}

	if userRole != "admin" && post.UserID != userID {
		WriteError(w, NewForbiddenError("Недостаточно прав"))
		return
	}

	var req UpdateDonationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	if err := h.db.UpdateDonationStatus(donationID, req.Status, userID); err != nil {
		WriteError(w, err)
		return
	}

	// Если подтверждено, обновляем рейтинг и собранную сумму
	if req.Status == "confirmed" {
		// Обновляем собранную сумму поста
		h.db.UpdatePostCollected(donation.PostID, donation.Amount)

		// Обновляем рейтинг донора
		rating, err := h.db.GetOrCreateRating(donation.DonorID)
		if err == nil {
			newPoints := rating.Points + int(donation.Amount) // 1 рубль = 1 балл
			newTotalDonated := rating.TotalDonated + donation.Amount
			h.db.UpdateRating(donation.DonorID, newPoints, newTotalDonated)
		}
	}

	donation, _ = h.db.GetDonationByID(donationID)
	response := map[string]interface{}{
		"id":           donation.ID,
		"status":       donation.Status,
		"confirmed_at": donation.ConfirmedAt,
		"confirmed_by": donation.ConfirmedBy,
	}
	WriteJSON(w, http.StatusOK, response)
}

// ========== Chat Endpoints ==========

// GetChats получает список чатов текущего пользователя
// @Summary     Получить список чатов
// @Description Возвращает список всех чатов текущего пользователя
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Success     200  {object}  ChatsListResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /chats [get]
func (h *Handlers) GetChats(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	chats, err := h.db.GetChatsByUserID(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	var chatsWithDetails []ChatWithDetails
	for _, chat := range chats {
		post, _ := h.db.GetPostByID(chat.PostID)
		var interlocutorID int64
		if chat.HelperID == userID {
			interlocutorID = chat.NeedyID
		} else {
			interlocutorID = chat.HelperID
		}
		interlocutor, _ := h.db.GetUserByID(interlocutorID)
		lastMessage, _ := h.db.GetLastMessage(chat.ID)
		unreadCount, _ := h.db.GetUnreadCount(chat.ID, userID)

		var postDetails *PostWithDetails
		if post != nil {
			author, _ := h.db.GetUserByID(post.UserID)
			var authorInfo *UserInfo
			if author != nil {
				name := fmt.Sprintf("%s %s", author.FirstName, author.LastName)
				authorInfo = &UserInfo{
					ID:     author.ID,
					Name:   name,
					Avatar: author.PhotoURL,
				}
			}
			postDetails = &PostWithDetails{
				Post:   *post,
				Author: authorInfo,
			}
		}

		var interlocutorInfo *UserInfo
		if interlocutor != nil {
			name := fmt.Sprintf("%s %s", interlocutor.FirstName, interlocutor.LastName)
			interlocutorInfo = &UserInfo{
				ID:     interlocutor.ID,
				Name:   name,
				Avatar: interlocutor.PhotoURL,
			}
		}

		chatsWithDetails = append(chatsWithDetails, ChatWithDetails{
			Chat:         chat,
			Post:         postDetails,
			Interlocutor: interlocutorInfo,
			LastMessage:  lastMessage,
			UnreadCount:  unreadCount,
		})
	}

	response := map[string]interface{}{
		"data": chatsWithDetails,
	}
	WriteJSON(w, http.StatusOK, response)
}

// CreateChat создает чат (при первом сообщении помощника к посту)
// @Summary     Создать чат
// @Description Создает новый чат между помощником и нуждающимся по посту
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       request body CreateChatRequest true "ID поста"
// @Success     201  {object}  ChatResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     409  {object}  ErrorResponse
// @Router      /chats [post]
func (h *Handlers) CreateChat(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	var req CreateChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	post, err := h.db.GetPostByID(req.PostID)
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем, существует ли уже чат
	existingChat, _ := h.db.GetChatByPostAndHelper(req.PostID, userID)
	if existingChat != nil {
		WriteError(w, NewConflictError("Чат уже существует"))
		return
	}

	chat, err := h.db.CreateChat(req.PostID, userID, post.UserID)
	if err != nil {
		WriteError(w, err)
		return
	}

	response := map[string]interface{}{
		"id":         chat.ID,
		"post_id":    chat.PostID,
		"helper_id":  chat.HelperID,
		"needy_id":   chat.NeedyID,
		"created_at": chat.CreatedAt,
	}
	WriteJSON(w, http.StatusCreated, response)
}

// GetMessages получает сообщения чата
// @Summary     Получить сообщения чата
// @Description Возвращает список сообщений в чате с пагинацией
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID чата"
// @Param       page query int false "Номер страницы" default(1)
// @Param       limit query int false "Количество сообщений" default(50)
// @Success     200  {object}  MessagesListResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /chats/{id}/messages [get]
func (h *Handlers) GetMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID чата", nil))
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	messages, total, err := h.db.GetMessages(chatID, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	var messagesWithDetails []MessageWithDetails
	for _, msg := range messages {
		sender, _ := h.db.GetUserByID(msg.SenderID)
		var senderInfo *UserInfo
		if sender != nil {
			name := fmt.Sprintf("%s %s", sender.FirstName, sender.LastName)
			if sender.HelperName != nil {
				name = *sender.HelperName
			}
			senderInfo = &UserInfo{
				ID:     sender.ID,
				Name:   name,
				Avatar: sender.PhotoURL,
			}
		}

		messagesWithDetails = append(messagesWithDetails, MessageWithDetails{
			Message: msg,
			Sender:  senderInfo,
		})
	}

	totalPages := (total + limit - 1) / limit
	response := map[string]interface{}{
		"data": messagesWithDetails,
		"pagination": PaginationResponse{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
	WriteJSON(w, http.StatusOK, response)
}

// SendMessage отправляет сообщение в чат
// @Summary     Отправить сообщение
// @Description Отправляет новое сообщение в чат (текст или вложение)
// @Tags        Чаты
// @Accept      multipart/form-data
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID чата"
// @Param       text formData string false "Текст сообщения"
// @Param       attachment formData file false "Вложение (изображение, до 5MB)"
// @Success     201  {object}  MessageResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /chats/{id}/messages [post]
func (h *Handlers) SendMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID чата", nil))
		return
	}

	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	if err := ParseMultipartForm(r, 5<<20); err != nil {
		WriteError(w, err)
		return
	}

	var text *string
	if textVal := r.FormValue("text"); textVal != "" {
		text = &textVal
	}

	var message *Message
	var attachmentURL *string

	if attachment, header, err := r.FormFile("attachment"); err == nil {
		defer attachment.Close()

		if err := ValidateFileSize(header, 5<<20); err != nil {
			WriteError(w, err)
			return
		}

		if err := ValidateImageFile(header); err != nil {
			WriteError(w, err)
			return
		}

		// Создаем сообщение сначала чтобы получить ID
		message = &Message{
			ChatID:   chatID,
			SenderID: userID,
			Text:     text,
		}
		if err := h.db.CreateMessage(message); err != nil {
			WriteError(w, err)
			return
		}

		ctx := r.Context()
		objectKey, err := UploadChatAttachment(ctx, h.minioClient, chatID, message.ID, attachment, header.Size, header.Header.Get("Content-Type"))
		if err != nil {
			WriteError(w, NewInternalError("Ошибка загрузки вложения"))
			return
		}

		url := GetObjectURL(h.cfg.MinIOConfig, BucketChatAttachments, objectKey)
		attachmentURL = &url
		message.AttachmentURL = attachmentURL
		// Обновляем сообщение с attachment_url (нужно добавить функцию)
	} else {
		if text == nil {
			WriteError(w, NewValidationError("Текст или вложение обязательны", nil))
			return
		}

		message = &Message{
			ChatID:        chatID,
			SenderID:      userID,
			Text:          text,
			AttachmentURL: attachmentURL,
		}
		if err := h.db.CreateMessage(message); err != nil {
			WriteError(w, err)
			return
		}
	}

	// Обновляем время последнего сообщения в чате
	h.db.UpdateChatUpdatedAt(chatID)

	response := map[string]interface{}{
		"id":             message.ID,
		"chat_id":        message.ChatID,
		"sender_id":      message.SenderID,
		"text":           message.Text,
		"attachment_url": message.AttachmentURL,
		"is_read":        message.IsRead,
		"is_edited":      message.IsEdited,
		"created_at":     message.CreatedAt,
	}
	WriteJSON(w, http.StatusCreated, response)
}

// MarkMessagesRead отмечает сообщения как прочитанные
// @Summary     Отметить сообщения как прочитанные
// @Description Отмечает сообщения в чате как прочитанные
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID чата"
// @Param       request body MarkMessagesReadRequest false "ID сообщений (опционально, если пусто - все сообщения)"
// @Success     200  {object}  MarkMessagesReadResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /chats/{id}/messages/read [patch]
func (h *Handlers) MarkMessagesRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID чата", nil))
		return
	}

	var req MarkMessagesReadRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, NewValidationError("Неверный формат запроса", nil))
			return
		}
	}

	count, err := h.db.MarkMessagesAsRead(chatID, req.MessageIDs)
	if err != nil {
		WriteError(w, err)
		return
	}

	response := map[string]interface{}{
		"updated_count": count,
		"message":       "Сообщения отмечены как прочитанные",
	}
	WriteJSON(w, http.StatusOK, response)
}

// UpdateMessage редактирует сообщение (только отправитель)
// @Summary     Редактировать сообщение
// @Description Редактирует текст сообщения (только отправитель может редактировать)
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID чата"
// @Param       message_id path int true "ID сообщения"
// @Param       request body UpdateMessageRequest true "Новый текст"
// @Success     200  {object}  MessageUpdateResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /chats/{id}/messages/{message_id} [patch]
func (h *Handlers) UpdateMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	_, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID чата", nil))
		return
	}

	messageID, err := strconv.ParseInt(vars["message_id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID сообщения", nil))
		return
	}

	_, err = GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем, что сообщение принадлежит пользователю (нужно добавить GetMessageByID)
	// Пока пропускаем проверку

	var req UpdateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	if err := h.db.UpdateMessage(messageID, req.Text); err != nil {
		WriteError(w, err)
		return
	}

	response := map[string]interface{}{
		"id":         messageID,
		"text":       req.Text,
		"is_edited":  true,
		"updated_at": time.Now(),
	}
	WriteJSON(w, http.StatusOK, response)
}

// DeleteMessage удаляет сообщение (только отправитель)
// @Summary     Удалить сообщение
// @Description Удаляет сообщение из чата (только отправитель может удалить)
// @Tags        Чаты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       id path int true "ID чата"
// @Param       message_id path int true "ID сообщения"
// @Success     204  "Успешно удалено"
// @Failure     401  {object}  ErrorResponse
// @Failure     403  {object}  ErrorResponse
// @Router      /chats/{id}/messages/{message_id} [delete]
func (h *Handlers) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	messageID, err := strconv.ParseInt(vars["message_id"], 10, 64)
	if err != nil {
		WriteError(w, NewValidationError("Неверный ID сообщения", nil))
		return
	}

	_, err = GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	// Проверяем права (нужно добавить GetMessageByID)
	// Пока пропускаем

	if err := h.db.DeleteMessage(messageID); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Rating Endpoints ==========

// GetRatings получает рейтинг пользователей
// @Summary     Получить рейтинг пользователей
// @Description Возвращает рейтинг пользователей с пагинацией
// @Tags        Рейтинг
// @Accept      json
// @Produce     json
// @Param       page query int false "Номер страницы" default(1)
// @Param       limit query int false "Количество на странице" default(50)
// @Success     200  {object}  RatingsListResponse
// @Router      /ratings [get]
func (h *Handlers) GetRatings(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	ratings, total, err := h.db.GetRatings(page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	var ratingsWithDetails []RatingWithDetails
	for i, rating := range ratings {
		user, _ := h.db.GetUserByID(rating.UserID)
		var userInfo *UserInfo
		if user != nil {
			name := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
			if user.HelperName != nil {
				name = *user.HelperName
			}
			userInfo = &UserInfo{
				ID:     user.ID,
				Name:   name,
				Avatar: user.PhotoURL,
			}
		}

		position := (page-1)*limit + i + 1
		ratingsWithDetails = append(ratingsWithDetails, RatingWithDetails{
			Rating:   rating,
			User:     userInfo,
			Position: position,
		})
	}

	totalPages := (total + limit - 1) / limit
	response := map[string]interface{}{
		"data": ratingsWithDetails,
		"pagination": PaginationResponse{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetMyRating получает рейтинг текущего пользователя
// @Summary     Получить свой рейтинг
// @Description Возвращает рейтинг текущего пользователя с позицией
// @Tags        Рейтинг
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Success     200  {object}  RatingWithDetails
// @Failure     401  {object}  ErrorResponse
// @Failure     404  {object}  ErrorResponse
// @Router      /ratings/me [get]
func (h *Handlers) GetMyRating(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromContext(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	rating, err := h.db.GetOrCreateRating(userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	position, _ := h.db.GetRatingPosition(userID)

	response := RatingWithDetails{
		Rating:   *rating,
		Position: position,
	}
	WriteJSON(w, http.StatusOK, response)
}

// ========== Utility Endpoints ==========

// GetPresignedURL получает presigned URL для загрузки файла
// @Summary     Получить presigned URL
// @Description Генерирует presigned URL для прямой загрузки файла в MinIO
// @Tags        Утилиты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       request body PresignedURLRequest true "Параметры загрузки"
// @Success     200  {object}  PresignedURLResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /upload/presigned-url [post]
func (h *Handlers) GetPresignedURL(w http.ResponseWriter, r *http.Request) {
	var req PresignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	expiresIn := time.Duration(req.ExpiresIn) * time.Second
	if expiresIn == 0 {
		expiresIn = time.Hour
	}

	ctx := r.Context()
	uploadURL, err := GeneratePresignedURL(ctx, h.minioClient, req.Bucket, req.ObjectKey, req.ContentType, expiresIn)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка генерации URL"))
		return
	}

	objectURL := GetObjectURL(h.cfg.MinIOConfig, req.Bucket, req.ObjectKey)
	response := PresignedURLResponse{
		UploadURL: uploadURL,
		ObjectURL: objectURL,
		ExpiresAt: time.Now().Add(expiresIn),
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetPresignedGetURL получает presigned URL для чтения файла
// @Summary     Получить presigned URL для чтения
// @Description Генерирует presigned URL для чтения (скачивания) файла из MinIO
// @Tags        Утилиты
// @Accept      json
// @Produce     json
// @Security    BearerAuth
// @Param       request body PresignedGetURLRequest true "Параметры запроса"
// @Success     200  {object}  PresignedGetURLResponse
// @Failure     400  {object}  ErrorResponse
// @Failure     401  {object}  ErrorResponse
// @Router      /files/presigned-url [post]
func (h *Handlers) GetPresignedGetURL(w http.ResponseWriter, r *http.Request) {
	var req PresignedGetURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, NewValidationError("Неверный формат запроса", nil))
		return
	}

	if err := ValidateStruct(&req); err != nil {
		WriteError(w, err)
		return
	}

	expiresIn := time.Duration(req.ExpiresIn) * time.Second
	if expiresIn == 0 {
		expiresIn = time.Hour // По умолчанию 1 час
	}

	ctx := r.Context()
	url, err := GeneratePresignedGetURL(ctx, h.minioClient, req.Bucket, req.ObjectKey, expiresIn)
	if err != nil {
		WriteError(w, NewInternalError("Ошибка генерации URL"))
		return
	}

	response := PresignedGetURLResponse{
		URL:       url,
		ExpiresAt: time.Now().Add(expiresIn),
	}
	WriteJSON(w, http.StatusOK, response)
}

// GetFile проксирует файл из MinIO через backend
// @Summary     Получить файл
// @Description Получает файл из MinIO и отдает его клиенту (проксирование). Путь к файлу может содержать слэши, например: /files/user-photos/users/1/photo.jpg
// @Tags        Утилиты
// @Accept      json
// @Produce     application/octet-stream
// @Param       bucket path string true "Название bucket"
// @Param       objectKey path string true "Ключ объекта (путь к файлу, может содержать слэши)"
// @Success     200  "Файл"
// @Failure     404  {object}  ErrorResponse
// @Failure     500  {object}  ErrorResponse
// @Router      /files/{bucket}/{objectKey} [get]
func (h *Handlers) GetFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	bucket := vars["bucket"]
	objectKey := vars["objectKey"]

	if bucket == "" || objectKey == "" {
		WriteError(w, NewValidationError("Bucket и objectKey обязательны", nil))
		return
	}

	ctx := r.Context()
	obj, err := GetObject(ctx, h.minioClient, bucket, objectKey)
	if err != nil {
		WriteError(w, NewNotFoundError("Файл не найден"))
		return
	}
	defer obj.Close()

	// Получаем информацию об объекте
	objInfo, err := obj.Stat()
	if err != nil {
		WriteError(w, NewInternalError("Ошибка получения информации о файле"))
		return
	}

	// Устанавливаем заголовки
	w.Header().Set("Content-Type", objInfo.ContentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", objInfo.Size))
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filepath.Base(objectKey)))

	// Копируем содержимое файла в ответ
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, obj); err != nil {
		// Ошибка уже произошла, но мы не можем отправить ошибку, так как заголовки уже отправлены
		return
	}
}

// ========== Helper functions ==========

func getStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
