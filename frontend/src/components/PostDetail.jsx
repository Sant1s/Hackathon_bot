import React, { useState, useEffect } from 'react';

const PostDetail = ({ post, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !post) return null;

  // Обрабатываем изображения: проверяем разные возможные поля
  let images = [];
  if (post.images && Array.isArray(post.images) && post.images.length > 0) {
    images = post.images;
  } else if (post.media && Array.isArray(post.media) && post.media.length > 0) {
    images = post.media;
  } else if (post.image) {
    images = [post.image];
  } else if (post.photo) {
    images = [post.photo];
  } else {
    images = ['/placeholder.svg'];
  }
  
  const totalImages = images.length;
  
  // Обрабатываем аватар автора
  let authorAvatar = post.avatar || 
                    post.author?.avatar || 
                    post.author?.photo || 
                    post.author?.image ||
                    post.user?.avatar ||
                    post.user?.photo ||
                    post.user?.image ||
                    '/placeholder-avatar.svg';
  
  // Обрабатываем имя автора
  let authorName = post.authorName ||
                   post.author?.name ||
                   (post.author?.firstName && post.author?.lastName 
                     ? `${post.author.firstName} ${post.author.lastName}` 
                     : null) ||
                   post.user?.name ||
                   (post.user?.firstName && post.user?.lastName 
                     ? `${post.user.firstName} ${post.user.lastName}` 
                     : null) ||
                   'Неизвестный автор';

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? totalImages - 1 : prevIndex - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => (prevIndex === totalImages - 1 ? 0 : prevIndex + 1));
  };

  const progress = post.amount > 0 ? ((post.collected || 0) / post.amount * 100) : 0;
  const uniqueId = String(post.id).padStart(6, '0');

  return (
    <div
      className={`post-detail ${isOpen ? 'active' : ''}`}
      onClick={onClose}
    >
      <div
        className="post-detail-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="detail-post-id">ID: {uniqueId}</div>

        <div className="post-detail-header">
          <img src={images[currentImageIndex]} alt={post.title} className="post-detail-image" />
          {totalImages > 1 && (
            <>
              <button className="detail-arrow detail-arrow-prev" onClick={handlePrevImage}>
                <svg viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button className="detail-arrow detail-arrow-next" onClick={handleNextImage}>
                <svg viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <div className="detail-image-counter">
                {currentImageIndex + 1} / {totalImages}
              </div>
            </>
          )}
        </div>

        <div className="post-detail-body">
          <div className="detail-author">
            <img src={authorAvatar} alt={authorName} className="detail-avatar" />
            <div className="detail-author-info">
              <h3>{authorName}</h3>
              <p>Нуждается в помощи</p>
            </div>
          </div>

          <h2 className="post-detail-title">{post.title || 'Без названия'}</h2>
          <p className="post-detail-description">{post.description || 'Описание отсутствует.'}</p>

          <div className="amount-display" style={{ '--progress-width': `${progress}%` }}>
            <div className="amount-display-content">
              <span className="amount-display-collected">{(post.collected || 0).toLocaleString('ru-RU')}</span>
              <span className="amount-display-target">{post.amount.toLocaleString('ru-RU')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;

