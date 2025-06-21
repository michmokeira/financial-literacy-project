async function toggleLike(postId) {
    try {
        const response = await fetch(`/forum/post/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            // Get the like button
            const likeButton = document.querySelector(`[onclick="toggleLike('${postId}')"]`);
            const likeIcon = likeButton.querySelector('i');
            const likeCount = document.getElementById(`likeCount-${postId}`);
            
            if (data.liked) {
                likeButton.classList.add('bg-blue-50', 'text-blue-600');
                likeButton.classList.remove('text-gray-600', 'hover:bg-gray-50');
                likeIcon.classList.add('text-blue-600');
            } else {
                likeButton.classList.remove('bg-blue-50', 'text-blue-600');
                likeButton.classList.add('text-gray-600', 'hover:bg-gray-50');
                likeIcon.classList.remove('text-blue-600');
            }
            
            // Update like count if element exists
            if (likeCount) {
                likeCount.textContent = data.likeCount;
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

async function toggleCommentLike(postId, commentId) {
    try {
        const response = await fetch(`/forum/post/${postId}/comment/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            // Get the like button
            const likeButton = document.querySelector(`[onclick="toggleCommentLike('${postId}', '${commentId}')"]`);
            const likeIcon = likeButton.querySelector('i');
            const likeCount = document.getElementById(`commentLikeCount-${commentId}`);
            
            if (data.liked) {
                likeButton.classList.add('text-blue-600');
                likeIcon.classList.add('text-blue-600');
            } else {
                likeButton.classList.remove('text-blue-600');
                likeIcon.classList.remove('text-blue-600');
            }
            
            // Update like count if element exists
            if (likeCount) {
                likeCount.textContent = data.likeCount;
            }
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
    }
}
