package main

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func NewDB(databaseURL string) (*DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// InitSchema создает все таблицы базы данных
func (db *DB) InitSchema() error {
	queries := []string{
		// Таблица users
		`CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			phone VARCHAR(20) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			first_name VARCHAR(100) NOT NULL,
			last_name VARCHAR(100) NOT NULL,
			photo_url VARCHAR(500),
			role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'helper', 'needy', 'admin')),
			helper_name VARCHAR(100),
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			is_active BOOLEAN DEFAULT true
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`,
		`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,

		// Таблица verifications
		`CREATE TABLE IF NOT EXISTS verifications (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			user_photo_url VARCHAR(500),
			last_name VARCHAR(100) NOT NULL,
			first_name VARCHAR(100) NOT NULL,
			middle_name VARCHAR(100),
			birth_date DATE NOT NULL,
			passport_series VARCHAR(10) NOT NULL,
			passport_number VARCHAR(20) NOT NULL,
			passport_issuer VARCHAR(500) NOT NULL,
			passport_date DATE NOT NULL,
			doc_type VARCHAR(10) NOT NULL CHECK (doc_type IN ('inn', 'snils')),
			inn VARCHAR(20),
			snils VARCHAR(20),
			passport_scans_urls TEXT[],
			consent1 BOOLEAN DEFAULT false,
			consent2 BOOLEAN DEFAULT false,
			consent3 BOOLEAN DEFAULT false,
			status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
			submitted_at TIMESTAMP DEFAULT NOW(),
			reviewed_at TIMESTAMP,
			reviewed_by BIGINT REFERENCES users(id),
			rejection_reason TEXT
		)`,
		`CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status)`,

		// Таблица posts
		`CREATE TABLE IF NOT EXISTS posts (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(500) NOT NULL,
			description TEXT NOT NULL,
			amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
			collected DECIMAL(15,2) DEFAULT 0 CHECK (collected >= 0),
			recipient VARCHAR(200) NOT NULL,
			bank VARCHAR(100) NOT NULL,
			phone VARCHAR(20) NOT NULL,
			status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed', 'moderated')),
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			is_editable BOOLEAN DEFAULT true
		)`,
		`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)`,
		`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`,

		// Таблица post_media
		`CREATE TABLE IF NOT EXISTS post_media (
			id BIGSERIAL PRIMARY KEY,
			post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
			media_url VARCHAR(500) NOT NULL,
			media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
			order_index INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id)`,
		`CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, order_index)`,

		// Таблица donations
		`CREATE TABLE IF NOT EXISTS donations (
			id BIGSERIAL PRIMARY KEY,
			post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
			donor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
			receipt_url VARCHAR(500),
			status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
			confirmed_at TIMESTAMP,
			confirmed_by BIGINT REFERENCES users(id),
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_donations_post_id ON donations(post_id)`,
		`CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id)`,
		`CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)`,
		`CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC)`,

		// Таблица chats
		`CREATE TABLE IF NOT EXISTS chats (
			id BIGSERIAL PRIMARY KEY,
			post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
			helper_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			needy_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			UNIQUE(post_id, helper_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_chats_post_id ON chats(post_id)`,
		`CREATE INDEX IF NOT EXISTS idx_chats_helper_id ON chats(helper_id)`,
		`CREATE INDEX IF NOT EXISTS idx_chats_needy_id ON chats(needy_id)`,

		// Таблица messages
		`CREATE TABLE IF NOT EXISTS messages (
			id BIGSERIAL PRIMARY KEY,
			chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
			sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			text TEXT,
			attachment_url VARCHAR(500),
			is_read BOOLEAN DEFAULT false,
			is_edited BOOLEAN DEFAULT false,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			CHECK (text IS NOT NULL OR attachment_url IS NOT NULL)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`,
		`CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`,
		`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(chat_id, created_at DESC)`,

		// Таблица ratings
		`CREATE TABLE IF NOT EXISTS ratings (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			points INTEGER DEFAULT 0 CHECK (points >= 0),
			total_donated DECIMAL(15,2) DEFAULT 0 CHECK (total_donated >= 0),
			status VARCHAR(50),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_ratings_points ON ratings(points DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_ratings_total_donated ON ratings(total_donated DESC)`,

		// Старая таблица files (оставляем для совместимости)
		`CREATE TABLE IF NOT EXISTS files (
		id SERIAL PRIMARY KEY,
		filename VARCHAR(255) NOT NULL,
		content_type VARCHAR(100),
		size BIGINT,
		minio_object_name VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute schema query: %w", err)
		}
	}

	return nil
}

// ========== User functions ==========

// CreateUser создает нового пользователя
func (db *DB) CreateUser(phone, passwordHash, firstName, lastName string) (*User, error) {
	var user User
	query := `INSERT INTO users (phone, password_hash, first_name, last_name) 
	          VALUES ($1, $2, $3, $4) 
	          RETURNING id, phone, first_name, last_name, photo_url, role, helper_name, created_at, updated_at, is_active`
	err := db.QueryRow(query, phone, passwordHash, firstName, lastName).Scan(
		&user.ID, &user.Phone, &user.FirstName, &user.LastName,
		&user.PhotoURL, &user.Role, &user.HelperName, &user.CreatedAt, &user.UpdatedAt, &user.IsActive,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			return nil, NewConflictError("Пользователь с таким телефоном уже существует")
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return &user, nil
}

// GetUserByPhone получает пользователя по телефону
func (db *DB) GetUserByPhone(phone string) (*User, error) {
	var user User
	query := `SELECT id, phone, password_hash, first_name, last_name, photo_url, role, helper_name, created_at, updated_at, is_active 
	          FROM users WHERE phone = $1`
	err := db.QueryRow(query, phone).Scan(
		&user.ID, &user.Phone, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.PhotoURL, &user.Role, &user.HelperName, &user.CreatedAt, &user.UpdatedAt, &user.IsActive,
	)
	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Пользователь")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetUserByID получает пользователя по ID
func (db *DB) GetUserByID(id int64) (*User, error) {
	var user User
	query := `SELECT id, phone, password_hash, first_name, last_name, photo_url, role, helper_name, created_at, updated_at, is_active 
	          FROM users WHERE id = $1`
	err := db.QueryRow(query, id).Scan(
		&user.ID, &user.Phone, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.PhotoURL, &user.Role, &user.HelperName, &user.CreatedAt, &user.UpdatedAt, &user.IsActive,
	)
	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Пользователь")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// UpdateUser обновляет данные пользователя
func (db *DB) UpdateUser(id int64, firstName, lastName *string, helperName *string, photoURL *string) error {
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if firstName != nil {
		updates = append(updates, fmt.Sprintf("first_name = $%d", argPos))
		args = append(args, *firstName)
		argPos++
	}
	if lastName != nil {
		updates = append(updates, fmt.Sprintf("last_name = $%d", argPos))
		args = append(args, *lastName)
		argPos++
	}
	if helperName != nil {
		updates = append(updates, fmt.Sprintf("helper_name = $%d", argPos))
		args = append(args, *helperName)
		argPos++
	}
	if photoURL != nil {
		updates = append(updates, fmt.Sprintf("photo_url = $%d", argPos))
		args = append(args, *photoURL)
		argPos++
	}

	if len(updates) == 0 {
		return nil
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argPos))
	args = append(args, time.Now())
	argPos++

	args = append(args, id)
	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(updates, ", "), argPos)
	_, err := db.Exec(query, args...)
	return err
}

// UpdateUserPassword обновляет пароль пользователя
func (db *DB) UpdateUserPassword(id int64, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
	_, err := db.Exec(query, passwordHash, id)
	return err
}

// ========== Verification functions ==========

// CreateVerification создает заявку на верификацию
func (db *DB) CreateVerification(v *Verification) error {
	query := `INSERT INTO verifications 
	          (user_id, user_photo_url, last_name, first_name, middle_name, birth_date, 
	           passport_series, passport_number, passport_issuer, passport_date, 
	           doc_type, inn, snils, passport_scans_urls, consent1, consent2, consent3)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	          RETURNING id, status, submitted_at`
	var scansArray pq.StringArray
	if len(v.PassportScansURLs) > 0 {
		scansArray = pq.StringArray(v.PassportScansURLs)
	}
	err := db.QueryRow(query,
		v.UserID, v.UserPhotoURL, v.LastName, v.FirstName, v.MiddleName, v.BirthDate,
		v.PassportSeries, v.PassportNumber, v.PassportIssuer, v.PassportDate,
		v.DocType, v.INN, v.SNILS, scansArray, v.Consent1, v.Consent2, v.Consent3,
	).Scan(&v.ID, &v.Status, &v.SubmittedAt)
	return err
}

// GetVerificationByUserID получает верификацию по user_id
func (db *DB) GetVerificationByUserID(userID int64) (*Verification, error) {
	var v Verification
	var scansArray pq.StringArray
	query := `SELECT id, user_id, user_photo_url, last_name, first_name, middle_name, birth_date,
	                 passport_series, passport_number, passport_issuer, passport_date,
	                 doc_type, inn, snils, passport_scans_urls, consent1, consent2, consent3,
	                 status, submitted_at, reviewed_at, reviewed_by, rejection_reason
	          FROM verifications WHERE user_id = $1`
	err := db.QueryRow(query, userID).Scan(
		&v.ID, &v.UserID, &v.UserPhotoURL, &v.LastName, &v.FirstName, &v.MiddleName, &v.BirthDate,
		&v.PassportSeries, &v.PassportNumber, &v.PassportIssuer, &v.PassportDate,
		&v.DocType, &v.INN, &v.SNILS, &scansArray, &v.Consent1, &v.Consent2, &v.Consent3,
		&v.Status, &v.SubmittedAt, &v.ReviewedAt, &v.ReviewedBy, &v.RejectionReason,
	)
	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Верификация")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get verification: %w", err)
	}
	if len(scansArray) > 0 {
		v.PassportScansURLs = []string(scansArray)
	}
	return &v, nil
}

// GetVerifications получает список верификаций с фильтрацией
func (db *DB) GetVerifications(status string, page, limit int) ([]Verification, int, error) {
	where := "1=1"
	args := []interface{}{}
	argPos := 1

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, status)
		argPos++
	}

	// Подсчет общего количества
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM verifications WHERE %s", where)
	err := db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Получение данных
	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, user_id, first_name, last_name, status, submitted_at 
	                     FROM verifications WHERE %s ORDER BY submitted_at DESC LIMIT $%d OFFSET $%d`,
		where, argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var verifications []Verification
	for rows.Next() {
		var v Verification
		err := rows.Scan(&v.ID, &v.UserID, &v.FirstName, &v.LastName, &v.Status, &v.SubmittedAt)
		if err != nil {
			return nil, 0, err
		}
		verifications = append(verifications, v)
	}

	return verifications, total, nil
}

// UpdateVerificationStatus обновляет статус верификации
func (db *DB) UpdateVerificationStatus(id int64, status string, reviewedBy int64, rejectionReason *string) error {
	query := `UPDATE verifications 
	          SET status = $1, reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3 
	          WHERE id = $4`
	_, err := db.Exec(query, status, reviewedBy, rejectionReason, id)
	return err
}

// IsUserVerified проверяет, верифицирован ли пользователь
func (db *DB) IsUserVerified(userID int64) bool {
	var count int
	query := `SELECT COUNT(*) FROM verifications WHERE user_id = $1 AND status = 'approved'`
	db.QueryRow(query, userID).Scan(&count)
	return count > 0
}

// ========== Post functions ==========

// CreatePost создает новый пост
func (db *DB) CreatePost(p *Post) error {
	query := `INSERT INTO posts (user_id, title, description, amount, recipient, bank, phone)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
	          RETURNING id, collected, status, created_at, updated_at, is_editable`
	err := db.QueryRow(query, p.UserID, p.Title, p.Description, p.Amount, p.Recipient, p.Bank, p.Phone).Scan(
		&p.ID, &p.Collected, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.IsEditable,
	)
	return err
}

// GetPostByID получает пост по ID
func (db *DB) GetPostByID(id int64) (*Post, error) {
	var p Post
	query := `SELECT id, user_id, title, description, amount, collected, recipient, bank, phone, 
	                 status, created_at, updated_at, is_editable
	          FROM posts WHERE id = $1`
	err := db.QueryRow(query, id).Scan(
		&p.ID, &p.UserID, &p.Title, &p.Description, &p.Amount, &p.Collected,
		&p.Recipient, &p.Bank, &p.Phone, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.IsEditable,
	)
	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Пост")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get post: %w", err)
	}
	return &p, nil
}

// GetPosts получает список постов с фильтрацией и пагинацией
func (db *DB) GetPosts(status string, userID *int64, page, limit int) ([]Post, int, error) {
	where := "1=1"
	args := []interface{}{}
	argPos := 1

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, status)
		argPos++
	}
	if userID != nil {
		where += fmt.Sprintf(" AND user_id = $%d", argPos)
		args = append(args, *userID)
		argPos++
	}

	// Подсчет общего количества
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM posts WHERE %s", where)
	err := db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Получение данных
	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, user_id, title, description, amount, collected, recipient, bank, phone,
	                             status, created_at, updated_at, is_editable
	                      FROM posts WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		err := rows.Scan(
			&p.ID, &p.UserID, &p.Title, &p.Description, &p.Amount, &p.Collected,
			&p.Recipient, &p.Bank, &p.Phone, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.IsEditable,
		)
		if err != nil {
			return nil, 0, err
		}
		posts = append(posts, p)
	}

	return posts, total, nil
}

// UpdatePost обновляет пост
func (db *DB) UpdatePost(id int64, title, description *string, amount *float64, recipient, bank, phone *string) error {
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argPos))
		args = append(args, *title)
		argPos++
	}
	if description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argPos))
		args = append(args, *description)
		argPos++
	}
	if amount != nil {
		updates = append(updates, fmt.Sprintf("amount = $%d", argPos))
		args = append(args, *amount)
		argPos++
	}
	if recipient != nil {
		updates = append(updates, fmt.Sprintf("recipient = $%d", argPos))
		args = append(args, *recipient)
		argPos++
	}
	if bank != nil {
		updates = append(updates, fmt.Sprintf("bank = $%d", argPos))
		args = append(args, *bank)
		argPos++
	}
	if phone != nil {
		updates = append(updates, fmt.Sprintf("phone = $%d", argPos))
		args = append(args, *phone)
		argPos++
	}

	if len(updates) == 0 {
		return nil
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argPos))
	args = append(args, time.Now())
	argPos++

	args = append(args, id)
	query := fmt.Sprintf("UPDATE posts SET %s WHERE id = $%d", strings.Join(updates, ", "), argPos)
	_, err := db.Exec(query, args...)
	return err
}

// DeletePost удаляет пост
func (db *DB) DeletePost(id int64) error {
	query := `DELETE FROM posts WHERE id = $1`
	_, err := db.Exec(query, id)
	return err
}

// UpdatePostCollected обновляет собранную сумму поста
func (db *DB) UpdatePostCollected(postID int64, amount float64) error {
	query := `UPDATE posts SET collected = collected + $1, updated_at = NOW() WHERE id = $2`
	_, err := db.Exec(query, amount, postID)
	return err
}

// ========== PostMedia functions ==========

// CreatePostMedia создает медиа файл для поста
func (db *DB) CreatePostMedia(postID int64, mediaURL, mediaType string, orderIndex int) (*PostMedia, error) {
	var pm PostMedia
	query := `INSERT INTO post_media (post_id, media_url, media_type, order_index)
	          VALUES ($1, $2, $3, $4)
	          RETURNING id, post_id, media_url, media_type, order_index, created_at`
	err := db.QueryRow(query, postID, mediaURL, mediaType, orderIndex).Scan(
		&pm.ID, &pm.PostID, &pm.MediaURL, &pm.MediaType, &pm.OrderIndex, &pm.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create post media: %w", err)
	}
	return &pm, nil
}

// GetPostMedia получает все медиа файлы поста
func (db *DB) GetPostMedia(postID int64) ([]PostMedia, error) {
	query := `SELECT id, post_id, media_url, media_type, order_index, created_at
	          FROM post_media WHERE post_id = $1 ORDER BY order_index`
	rows, err := db.Query(query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var media []PostMedia
	for rows.Next() {
		var pm PostMedia
		err := rows.Scan(&pm.ID, &pm.PostID, &pm.MediaURL, &pm.MediaType, &pm.OrderIndex, &pm.CreatedAt)
		if err != nil {
			return nil, err
		}
		media = append(media, pm)
	}
	return media, nil
}

// DeletePostMedia удаляет медиа файл
func (db *DB) DeletePostMedia(mediaID int64) error {
	query := `DELETE FROM post_media WHERE id = $1`
	_, err := db.Exec(query, mediaID)
	return err
}

// ========== Donation functions ==========

// CreateDonation создает пожертвование
func (db *DB) CreateDonation(d *Donation) error {
	query := `INSERT INTO donations (post_id, donor_id, amount, receipt_url)
	          VALUES ($1, $2, $3, $4)
	          RETURNING id, status, created_at`
	err := db.QueryRow(query, d.PostID, d.DonorID, d.Amount, d.ReceiptURL).Scan(
		&d.ID, &d.Status, &d.CreatedAt,
	)
	return err
}

// GetDonationByID получает пожертвование по ID
func (db *DB) GetDonationByID(id int64) (*Donation, error) {
	var d Donation
	query := `SELECT id, post_id, donor_id, amount, receipt_url, status, confirmed_at, confirmed_by, created_at
	          FROM donations WHERE id = $1`
	err := db.QueryRow(query, id).Scan(
		&d.ID, &d.PostID, &d.DonorID, &d.Amount, &d.ReceiptURL,
		&d.Status, &d.ConfirmedAt, &d.ConfirmedBy, &d.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Пожертвование")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get donation: %w", err)
	}
	return &d, nil
}

// GetDonations получает список пожертвований с фильтрацией
func (db *DB) GetDonations(postID, donorID *int64, status string, page, limit int) ([]Donation, int, error) {
	where := "1=1"
	args := []interface{}{}
	argPos := 1

	if postID != nil {
		where += fmt.Sprintf(" AND post_id = $%d", argPos)
		args = append(args, *postID)
		argPos++
	}
	if donorID != nil {
		where += fmt.Sprintf(" AND donor_id = $%d", argPos)
		args = append(args, *donorID)
		argPos++
	}
	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, status)
		argPos++
	}

	// Подсчет общего количества
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM donations WHERE %s", where)
	err := db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Получение данных
	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, post_id, donor_id, amount, receipt_url, status, confirmed_at, confirmed_by, created_at
	                      FROM donations WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var donations []Donation
	for rows.Next() {
		var d Donation
		err := rows.Scan(
			&d.ID, &d.PostID, &d.DonorID, &d.Amount, &d.ReceiptURL,
			&d.Status, &d.ConfirmedAt, &d.ConfirmedBy, &d.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		donations = append(donations, d)
	}

	return donations, total, nil
}

// UpdateDonationStatus обновляет статус пожертвования
func (db *DB) UpdateDonationStatus(id int64, status string, confirmedBy int64) error {
	query := `UPDATE donations 
	          SET status = $1, confirmed_at = NOW(), confirmed_by = $2 
	          WHERE id = $3`
	_, err := db.Exec(query, status, confirmedBy, id)
	return err
}

// ========== Chat functions ==========

// CreateChat создает чат
func (db *DB) CreateChat(postID, helperID, needyID int64) (*Chat, error) {
	var chat Chat
	query := `INSERT INTO chats (post_id, helper_id, needy_id)
	          VALUES ($1, $2, $3)
	          RETURNING id, post_id, helper_id, needy_id, created_at, updated_at`
	err := db.QueryRow(query, postID, helperID, needyID).Scan(
		&chat.ID, &chat.PostID, &chat.HelperID, &chat.NeedyID, &chat.CreatedAt, &chat.UpdatedAt,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			return nil, NewConflictError("Чат уже существует")
		}
		return nil, fmt.Errorf("failed to create chat: %w", err)
	}
	return &chat, nil
}

// GetChatByPostAndHelper получает чат по post_id и helper_id
func (db *DB) GetChatByPostAndHelper(postID, helperID int64) (*Chat, error) {
	var chat Chat
	query := `SELECT id, post_id, helper_id, needy_id, created_at, updated_at
	          FROM chats WHERE post_id = $1 AND helper_id = $2`
	err := db.QueryRow(query, postID, helperID).Scan(
		&chat.ID, &chat.PostID, &chat.HelperID, &chat.NeedyID, &chat.CreatedAt, &chat.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil // Чат не найден, но это не ошибка
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get chat: %w", err)
	}
	return &chat, nil
}

// GetChatsByUserID получает все чаты пользователя
func (db *DB) GetChatsByUserID(userID int64) ([]Chat, error) {
	query := `SELECT id, post_id, helper_id, needy_id, created_at, updated_at
	          FROM chats WHERE helper_id = $1 OR needy_id = $1 ORDER BY updated_at DESC`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chat Chat
		err := rows.Scan(&chat.ID, &chat.PostID, &chat.HelperID, &chat.NeedyID, &chat.CreatedAt, &chat.UpdatedAt)
		if err != nil {
			return nil, err
		}
		chats = append(chats, chat)
	}
	return chats, nil
}

// UpdateChatUpdatedAt обновляет время последнего сообщения в чате
func (db *DB) UpdateChatUpdatedAt(chatID int64) error {
	query := `UPDATE chats SET updated_at = NOW() WHERE id = $1`
	_, err := db.Exec(query, chatID)
	return err
}

// ========== Message functions ==========

// CreateMessage создает сообщение
func (db *DB) CreateMessage(m *Message) error {
	query := `INSERT INTO messages (chat_id, sender_id, text, attachment_url)
	          VALUES ($1, $2, $3, $4)
	          RETURNING id, is_read, is_edited, created_at, updated_at`
	err := db.QueryRow(query, m.ChatID, m.SenderID, m.Text, m.AttachmentURL).Scan(
		&m.ID, &m.IsRead, &m.IsEdited, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create message: %w", err)
	}
	return nil
}

// GetMessages получает сообщения чата с пагинацией
func (db *DB) GetMessages(chatID int64, page, limit int) ([]Message, int, error) {
	// Подсчет общего количества
	var total int
	countQuery := `SELECT COUNT(*) FROM messages WHERE chat_id = $1`
	err := db.QueryRow(countQuery, chatID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Получение данных
	offset := (page - 1) * limit
	query := `SELECT id, chat_id, sender_id, text, attachment_url, is_read, is_edited, created_at, updated_at
	          FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := db.Query(query, chatID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		err := rows.Scan(
			&m.ID, &m.ChatID, &m.SenderID, &m.Text, &m.AttachmentURL,
			&m.IsRead, &m.IsEdited, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		messages = append(messages, m)
	}

	// Реверс для правильного порядка (от старых к новым)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, total, nil
}

// MarkMessagesAsRead отмечает сообщения как прочитанные
func (db *DB) MarkMessagesAsRead(chatID int64, messageIDs []int64) (int, error) {
	if len(messageIDs) == 0 {
		// Отметить все сообщения в чате
		query := `UPDATE messages SET is_read = true WHERE chat_id = $1 AND is_read = false`
		result, err := db.Exec(query, chatID)
		if err != nil {
			return 0, err
		}
		count, _ := result.RowsAffected()
		return int(count), nil
	}

	// Отметить конкретные сообщения
	query := `UPDATE messages SET is_read = true WHERE chat_id = $1 AND id = ANY($2)`
	result, err := db.Exec(query, chatID, pq.Array(messageIDs))
	if err != nil {
		return 0, err
	}
	count, _ := result.RowsAffected()
	return int(count), nil
}

// UpdateMessage обновляет сообщение
func (db *DB) UpdateMessage(messageID int64, text string) error {
	query := `UPDATE messages SET text = $1, is_edited = true, updated_at = NOW() WHERE id = $2`
	_, err := db.Exec(query, text, messageID)
	return err
}

// DeleteMessage удаляет сообщение
func (db *DB) DeleteMessage(messageID int64) error {
	query := `DELETE FROM messages WHERE id = $1`
	_, err := db.Exec(query, messageID)
	return err
}

// GetLastMessage получает последнее сообщение чата
func (db *DB) GetLastMessage(chatID int64) (*Message, error) {
	var m Message
	query := `SELECT id, chat_id, sender_id, text, attachment_url, is_read, is_edited, created_at, updated_at
	          FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`
	err := db.QueryRow(query, chatID).Scan(
		&m.ID, &m.ChatID, &m.SenderID, &m.Text, &m.AttachmentURL,
		&m.IsRead, &m.IsEdited, &m.CreatedAt, &m.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// GetUnreadCount получает количество непрочитанных сообщений в чате для пользователя
func (db *DB) GetUnreadCount(chatID, userID int64) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND sender_id != $2 AND is_read = false`
	err := db.QueryRow(query, chatID, userID).Scan(&count)
	return count, err
}

// ========== Rating functions ==========

// GetOrCreateRating получает или создает рейтинг пользователя
func (db *DB) GetOrCreateRating(userID int64) (*Rating, error) {
	var r Rating
	query := `SELECT id, user_id, points, total_donated, status, updated_at
	          FROM ratings WHERE user_id = $1`
	err := db.QueryRow(query, userID).Scan(
		&r.ID, &r.UserID, &r.Points, &r.TotalDonated, &r.Status, &r.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		// Создаем новый рейтинг
		query = `INSERT INTO ratings (user_id) VALUES ($1) RETURNING id, user_id, points, total_donated, status, updated_at`
		err = db.QueryRow(query, userID).Scan(
			&r.ID, &r.UserID, &r.Points, &r.TotalDonated, &r.Status, &r.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create rating: %w", err)
		}
		return &r, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get rating: %w", err)
	}
	return &r, nil
}

// UpdateRating обновляет рейтинг пользователя
func (db *DB) UpdateRating(userID int64, points int, totalDonated float64) error {
	// Вычисляем статус на основе баллов
	var status *string
	if points >= 5501 {
		s := "Пламенное Сердце"
		status = &s
	} else if points >= 2501 {
		s := "Благотворитель"
		status = &s
	} else if points >= 501 {
		s := "Хранитель Надежды"
		status = &s
	} else if points >= 5 {
		s := "Друг Платформы"
		status = &s
	}

	query := `UPDATE ratings 
	          SET points = $1, total_donated = $2, status = $3, updated_at = NOW() 
	          WHERE user_id = $4`
	_, err := db.Exec(query, points, totalDonated, status, userID)
	return err
}

// GetRatings получает рейтинг пользователей с пагинацией
func (db *DB) GetRatings(page, limit int) ([]Rating, int, error) {
	// Подсчет общего количества
	var total int
	countQuery := `SELECT COUNT(*) FROM ratings`
	err := db.QueryRow(countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Получение данных
	offset := (page - 1) * limit
	query := `SELECT id, user_id, points, total_donated, status, updated_at
	          FROM ratings ORDER BY points DESC LIMIT $1 OFFSET $2`
	rows, err := db.Query(query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var ratings []Rating
	for rows.Next() {
		var r Rating
		err := rows.Scan(&r.ID, &r.UserID, &r.Points, &r.TotalDonated, &r.Status, &r.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		ratings = append(ratings, r)
	}

	return ratings, total, nil
}

// GetRatingPosition получает позицию пользователя в рейтинге
func (db *DB) GetRatingPosition(userID int64) (int, error) {
	var position int
	query := `SELECT COUNT(*) + 1 FROM ratings WHERE points > (SELECT points FROM ratings WHERE user_id = $1)`
	err := db.QueryRow(query, userID).Scan(&position)
	return position, err
}
