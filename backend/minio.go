package main

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const (
	BucketUserPhotos       = "user-photos"
	BucketVerificationDocs = "verification-docs"
	BucketPostMedia        = "post-media"
	BucketDonationReceipts = "donation-receipts"
	BucketChatAttachments  = "chat-attachments"
)

func NewMinIOClient(cfg MinIOConfig) (*minio.Client, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	return client, nil
}

// EnsureBucket создает bucket если его нет
func EnsureBucket(ctx context.Context, client *minio.Client, bucketName string) error {
	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		if err := client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	return nil
}

// InitAllBuckets инициализирует все необходимые buckets
func InitAllBuckets(ctx context.Context, client *minio.Client) error {
	buckets := []string{
		BucketUserPhotos,
		BucketVerificationDocs,
		BucketPostMedia,
		BucketDonationReceipts,
		BucketChatAttachments,
	}

	for _, bucket := range buckets {
		if err := EnsureBucket(ctx, client, bucket); err != nil {
			return fmt.Errorf("failed to initialize bucket %s: %w", bucket, err)
		}
	}

	return nil
}

// UploadUserPhoto загружает фото профиля пользователя
func UploadUserPhoto(ctx context.Context, client *minio.Client, userID int64, file io.Reader, size int64, contentType string) (string, error) {
	ext := getExtensionFromContentType(contentType)
	objectKey := fmt.Sprintf("users/%d/photo%s", userID, ext)

	_, err := client.PutObject(ctx, BucketUserPhotos, objectKey, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload user photo: %w", err)
	}

	return objectKey, nil
}

// UploadVerificationDoc загружает документ верификации
func UploadVerificationDoc(ctx context.Context, client *minio.Client, verificationID int64, filename string, file io.Reader, size int64, contentType string) (string, error) {
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = getExtensionFromContentType(contentType)
	}
	objectKey := fmt.Sprintf("verifications/%d/%s%s", verificationID, filename, ext)

	_, err := client.PutObject(ctx, BucketVerificationDocs, objectKey, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload verification doc: %w", err)
	}

	return objectKey, nil
}

// UploadPostMedia загружает медиа файл поста
func UploadPostMedia(ctx context.Context, client *minio.Client, postID int64, index int, file io.Reader, size int64, contentType string) (string, error) {
	ext := getExtensionFromContentType(contentType)
	objectKey := fmt.Sprintf("posts/%d/media_%d%s", postID, index, ext)

	_, err := client.PutObject(ctx, BucketPostMedia, objectKey, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload post media: %w", err)
	}

	return objectKey, nil
}

// UploadDonationReceipt загружает чек пожертвования
func UploadDonationReceipt(ctx context.Context, client *minio.Client, donationID int64, file io.Reader, size int64, contentType string) (string, error) {
	ext := getExtensionFromContentType(contentType)
	objectKey := fmt.Sprintf("donations/%d/receipt%s", donationID, ext)

	_, err := client.PutObject(ctx, BucketDonationReceipts, objectKey, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload donation receipt: %w", err)
	}

	return objectKey, nil
}

// UploadChatAttachment загружает вложение в сообщении чата
func UploadChatAttachment(ctx context.Context, client *minio.Client, chatID, messageID int64, file io.Reader, size int64, contentType string) (string, error) {
	ext := getExtensionFromContentType(contentType)
	objectKey := fmt.Sprintf("chats/%d/messages/%d/attachment%s", chatID, messageID, ext)

	_, err := client.PutObject(ctx, BucketChatAttachments, objectKey, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload chat attachment: %w", err)
	}

	return objectKey, nil
}

// GeneratePresignedURL генерирует presigned URL для загрузки
func GeneratePresignedURL(ctx context.Context, client *minio.Client, bucket, objectKey, contentType string, expiresIn time.Duration) (string, error) {
	url, err := client.PresignedPutObject(ctx, bucket, objectKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return url.String(), nil
}

// GeneratePresignedGetURL генерирует presigned URL для чтения (скачивания) файла
func GeneratePresignedGetURL(ctx context.Context, client *minio.Client, bucket, objectKey string, expiresIn time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := client.PresignedGetObject(ctx, bucket, objectKey, expiresIn, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned get URL: %w", err)
	}
	return presignedURL.String(), nil
}

// GetObjectURL генерирует URL объекта через backend проксирование
// Используется для сохранения в БД, но при возврате клиенту нужно преобразовывать в рабочий URL
func GetObjectURL(cfg MinIOConfig, bucket, objectKey string) string {
	// Сохраняем в формате, который можно легко преобразовать
	// Формат: http://<endpoint>/<bucket>/<objectKey>
	// При возврате клиенту это будет преобразовано в /files/<bucket>/<objectKey>
	scheme := "http"
	if cfg.UseSSL {
		scheme = "https"
	}
	endpoint := cfg.Endpoint
	// Убираем порт для сохранения в БД (будет преобразовано при возврате)
	if strings.Contains(endpoint, ":") {
		parts := strings.Split(endpoint, ":")
		endpoint = parts[0]
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, endpoint, bucket, objectKey)
}

// ConvertMinIOURLToBackendURL преобразует MinIO URL в URL через backend проксирование
func ConvertMinIOURLToBackendURL(url string) string {
	if url == "" {
		return url
	}

	// Если URL уже в формате /files/..., возвращаем как есть
	if strings.HasPrefix(url, "/files/") {
		return url
	}

	// Парсим URL вида: http://localhost/user-photos/users/1/photo.jpg
	// или: http://localhost:9000/user-photos/users/1/photo.jpg
	// или: https://minio:9000/user-photos/users/1/photo.jpg
	parts := strings.Split(url, "/")

	// Ищем bucket в URL (пропускаем протокол и хост)
	bucketFound := false
	bucketIndex := -1
	for i, part := range parts {
		// Пропускаем пустые части и протокол
		if part == "" || part == "http:" || part == "https:" {
			continue
		}
		// Пропускаем хост (может содержать порт)
		if strings.Contains(part, ":") || i < 3 {
			continue
		}
		// Проверяем, является ли часть bucket'ом
		if part == BucketUserPhotos || part == BucketVerificationDocs ||
			part == BucketPostMedia || part == BucketDonationReceipts ||
			part == BucketChatAttachments {
			bucketFound = true
			bucketIndex = i
			break
		}
	}

	if bucketFound && bucketIndex >= 0 {
		// Нашли bucket, формируем новый URL через backend
		bucket := parts[bucketIndex]
		objectKey := strings.Join(parts[bucketIndex+1:], "/")
		return fmt.Sprintf("/files/%s/%s", bucket, objectKey)
	}

	// Если не удалось распарсить, возвращаем как есть
	return url
}

// GetObject возвращает объект из MinIO
func GetObject(ctx context.Context, client *minio.Client, bucket, objectKey string) (*minio.Object, error) {
	obj, err := client.GetObject(ctx, bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object: %w", err)
	}
	return obj, nil
}

// getExtensionFromContentType извлекает расширение из content type
func getExtensionFromContentType(contentType string) string {
	contentType = strings.ToLower(contentType)
	switch {
	case strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg"):
		return ".jpg"
	case strings.Contains(contentType, "png"):
		return ".png"
	case strings.Contains(contentType, "webp"):
		return ".webp"
	case strings.Contains(contentType, "mp4"):
		return ".mp4"
	case strings.Contains(contentType, "webm"):
		return ".webm"
	case strings.Contains(contentType, "pdf"):
		return ".pdf"
	default:
		return ".bin"
	}
}

// DeleteObject удаляет объект из MinIO
func DeleteObject(ctx context.Context, client *minio.Client, bucket, objectKey string) error {
	err := client.RemoveObject(ctx, bucket, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}
	return nil
}
