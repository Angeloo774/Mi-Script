import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, query, getDocs, orderBy, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDicdQuFJXTdTF2_BQc86C6GxvOBNC3oRI",
    authDomain: "probet-4aad0.firebaseapp.com",
    projectId: "probet-4aad0",
    storageBucket: "probet-4aad0.appspot.com",
    messagingSenderId: "761957051298",
    appId: "1:761957051298:web:88fe4baf06da975569e0fb",
    measurementId: "G-RXNE5YQBQD"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const uid = user.uid;
            const postsContainer = document.getElementById('postsContainer');

            // Mostrar la imagen de perfil
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const photoURL = userData.photoURL;
                if (photoURL) {
                    const decodedURL = decodeURIComponent(photoURL);
                    const fileName = decodedURL.split('/').pop().split('?')[0];

                    const photoRef = ref(storage, `photos/${uid}/${fileName}`);
                    const finalPhotoURL = await getDownloadURL(photoRef);
                    document.getElementById('profilePhoto').src = finalPhotoURL;
                }
            }

            // Redirigir a la página de añadir publicación con el uid
            document.getElementById('addPostButton').addEventListener('click', () => {
                window.location.href = `add-post.html?uid=${uid}`;
            });

            // Obtener y mostrar publicaciones
            const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(postsQuery);

            querySnapshot.forEach(async (postDoc) => {
                const postData = postDoc.data();
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.dataset.postId = postDoc.id;

                // Obtener los datos del usuario que creó la publicación
                const userPostDoc = await getDoc(doc(db, "users", postData.uid));
                if (userPostDoc.exists()) {
                    const userPostData = userPostDoc.data();

                    // Añadir imagen de perfil del autor
                    if (userPostData.photoURL) {
                        const profilePicElement = document.createElement('img');
                        const decodedURL = decodeURIComponent(userPostData.photoURL);
                        const fileName = decodedURL.split('/').pop().split('?')[0];
                        const imageRef = ref(storage, `photos/${postData.uid}/${fileName}`);
                        const finalProfilePicURL = await getDownloadURL(imageRef);
                        profilePicElement.src = finalProfilePicURL;
                        profilePicElement.classList.add('post-profile-pic');
                        postElement.appendChild(profilePicElement);
                    }

                    // Añadir nombre y nombre de usuario del autor
                    const nameElement = document.createElement('p');
                    nameElement.textContent = `${userPostData.name} (${userPostData.username})`;
                    nameElement.classList.add('post-author-info');
                    postElement.appendChild(nameElement);
                }

                // Añadir texto de la publicación
                if (postData.text) {
                    const textElement = document.createElement('p');
                    textElement.textContent = postData.text;
                    postElement.appendChild(textElement);
                }

                // Añadir imagen de la publicación
                if (postData.imageURL) {
                    const imageElement = document.createElement('img');
                    const decodedURL = decodeURIComponent(postData.imageURL);
                    const fileName = decodedURL.split('/').pop().split('?')[0];
                    const imageRef = ref(storage, `posts/${postData.uid}/${fileName}`);
                    const finalImageURL = await getDownloadURL(imageRef);
                    imageElement.src = finalImageURL;
                    imageElement.classList.add('post-image');
                    postElement.appendChild(imageElement);
                }

                // Añadir botones de like y dislike
                const likeButton = document.createElement('button');
                likeButton.classList.add('like-button');
                likeButton.textContent = 'Like';
                postElement.appendChild(likeButton);

                const likeCount = document.createElement('span');
                likeCount.classList.add('like-count');
                likeCount.textContent = postData.likes ? postData.likes.length : 0;
                postElement.appendChild(likeCount);

                const dislikeButton = document.createElement('button');
                dislikeButton.classList.add('dislike-button');
                dislikeButton.textContent = 'Dislike';
                postElement.appendChild(dislikeButton);

                const dislikeCount = document.createElement('span');
                dislikeCount.classList.add('dislike-count');
                dislikeCount.textContent = postData.dislikes ? postData.dislikes.length : 0;
                postElement.appendChild(dislikeCount);

                // Manejar eventos de like y dislike
                likeButton.addEventListener('click', async () => {
                    await handleLikeDislike(postDoc.id, uid, 'like');
                });

                dislikeButton.addEventListener('click', async () => {
                    await handleLikeDislike(postDoc.id, uid, 'dislike');
                });

                // Añadir botón para abrir comentarios
                const openCommentsButton = document.createElement('button');
                openCommentsButton.classList.add('open-comments-button');
                openCommentsButton.textContent = 'Ver comentarios';
                postElement.appendChild(openCommentsButton);

                // Contenedor para los comentarios
                const commentsContainer = document.createElement('div');
                commentsContainer.classList.add('comments-container');
                postElement.appendChild(commentsContainer);

                // Añadir botón para cerrar comentarios
                const closeCommentsButton = document.createElement('button');
                closeCommentsButton.classList.add('close-comments-button');
                closeCommentsButton.textContent = 'Cerrar comentarios';
                commentsContainer.appendChild(closeCommentsButton);

                // Añadir formulario para nuevos comentarios
                const commentForm = document.createElement('form');
                commentForm.classList.add('comment-form');
                commentForm.innerHTML = `
                    <input type="text" placeholder="Escribe un comentario..." class="comment-input">
                    <input type="file" accept="image/*" class="comment-image-input">
                    <button type="submit" class="comment-submit-button">Comentar</button>
                `;
                commentsContainer.appendChild(commentForm);

                // Contenedor para mostrar comentarios existentes
                const commentsList = document.createElement('div');
                commentsList.classList.add('comments-list');
                commentsContainer.appendChild(commentsList);

                // Manejar la apertura de comentarios
                openCommentsButton.addEventListener('click', async () => {
                    commentsContainer.style.display = 'block';
                    openCommentsButton.style.display = 'none';

                    // Cargar y mostrar los comentarios
                    await loadComments(postDoc.id, commentsList, uid);
                });

                // Manejar el cierre de comentarios
                closeCommentsButton.addEventListener('click', () => {
                    commentsContainer.style.display = 'none';
                    openCommentsButton.style.display = 'inline-block';
                });

                // Manejar envío de comentarios
                commentForm.addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const commentInput = commentForm.querySelector('.comment-input');
                    const commentImageInput = commentForm.querySelector('.comment-image-input');

                    if (commentInput.value || commentImageInput.files.length > 0) {
                        await addComment(postDoc.id, uid, commentInput.value, commentImageInput.files[0]);
                        commentInput.value = '';
                        commentImageInput.value = '';
                        await loadComments(postDoc.id, commentsList);
                    }
                });

                // Añadir publicación al contenedor
                postsContainer.appendChild(postElement);
            });
        } else {
            window.location.href = 'index.html'; // Redirigir si no está autenticado
        }
    });
});

// Función para manejar likes y dislikes (ya existente)
async function handleLikeDislike(postId, userId, action) {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const postData = postSnap.data();
        let likes = postData.likes || [];
        let dislikes = postData.dislikes || [];

        if (action === 'like') {
            if (!likes.includes(userId)) {
                likes.push(userId);
                dislikes = dislikes.filter(id => id !== userId); // Remover dislike si existe
            } else {
                likes = likes.filter(id => id !== userId); // Remover like si ya lo tiene
            }
        } else if (action === 'dislike') {
            if (!dislikes.includes(userId)) {
                dislikes.push(userId);
                likes = likes.filter(id => id !== userId); // Remover like si existe
            } else {
                dislikes = dislikes.filter(id => id !== userId); // Remover dislike si ya lo tiene
            }
        }

        await updateDoc(postRef, { likes, dislikes });
        
        // Actualizar los contadores en la interfaz
        document.querySelector(`[data-post-id="${postId}"] .like-count`).textContent = likes.length;
        document.querySelector(`[data-post-id="${postId}"] .dislike-count`).textContent = dislikes.length;
    }
}

// Función para agregar un comentario o respuesta
async function addComment(postId, userId, text, imageFile, parentCommentId = null) {
    const commentId = `comment_${new Date().getTime()}`;
    let imageURL = null;

    if (imageFile) {
        const storageRef = ref(storage, `comments/${postId}/${commentId}/${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(snapshot.ref);
    }

    const commentData = {
        uid: userId,
        text: text || '',
        imageURL: imageURL || null,
        createdAt: new Date(),
        parentCommentId: parentCommentId
    };

    await setDoc(doc(db, `posts/${postId}/comments`, commentId), commentData);
}

// Función para cargar y mostrar los comentarios de una publicación
async function loadComments(postId, commentsList, userId, parentCommentId = null) {
    commentsList.innerHTML = '';

    const commentsQuery = query(
        collection(db, `posts/${postId}/comments`),
        orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(commentsQuery);

    querySnapshot.forEach(async (commentDoc) => {
        const commentData = commentDoc.data();
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');

        // Mostrar solo los comentarios que no son respuestas (nivel superior)
        if (commentData.parentCommentId === parentCommentId) {
            // Obtener el nombre y la foto de perfil del autor del comentario
            const userDoc = await getDoc(doc(db, "users", commentData.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Añadir foto de perfil del autor del comentario
                if (userData.photoURL) {
                    const profilePicElement = document.createElement('img');
                    const decodedURL = decodeURIComponent(userData.photoURL);
                    const fileName = decodedURL.split('/').pop().split('?')[0];
                    const imageRef = ref(storage, `photos/${commentData.uid}/${fileName}`);
                    const finalProfilePicURL = await getDownloadURL(imageRef);
                    profilePicElement.src = finalProfilePicURL;
                    profilePicElement.classList.add('comment-profile-pic');
                    commentElement.appendChild(profilePicElement);
                }

                // Añadir nombre de usuario del autor del comentario
                const userNameElement = document.createElement('p');
                userNameElement.textContent = userData.username;
                userNameElement.classList.add('comment-author');
                commentElement.appendChild(userNameElement);
            }

            // Añadir texto del comentario
            if (commentData.text) {
                const textElement = document.createElement('p');
                textElement.textContent = commentData.text;
                commentElement.appendChild(textElement);
            }

            // Añadir imagen del comentario si existe
            if (commentData.imageURL) {
                const imageElement = document.createElement('img');
                imageElement.src = commentData.imageURL;
                imageElement.classList.add('comment-image');
                commentElement.appendChild(imageElement);
            }

            // Solo permitir respuestas a los comentarios de primer nivel
            if (parentCommentId === null) {
                // Botón para responder al comentario
                const replyButton = document.createElement('button');
                replyButton.classList.add('reply-button');
                replyButton.textContent = 'Responder';
                commentElement.appendChild(replyButton);

                // Contenedor para respuestas
                const repliesContainer = document.createElement('div');
                repliesContainer.classList.add('replies-container');
                commentElement.appendChild(repliesContainer);

                // Manejar la opción de responder a un comentario
                replyButton.addEventListener('click', () => {
                    const replyForm = document.createElement('form');
                    replyForm.classList.add('reply-form');
                    replyForm.innerHTML = `
                        <input type="text" placeholder="Escribe una respuesta..." class="reply-input">
                        <input type="file" accept="image/*" class="reply-image-input">
                        <button type="submit" class="reply-submit-button">Responder</button>
                    `;
                    repliesContainer.appendChild(replyForm);

                    // Manejar el envío de una respuesta
                    replyForm.addEventListener('submit', async (event) => {
                        event.preventDefault();
                        const replyInput = replyForm.querySelector('.reply-input');
                        const replyImageInput = replyForm.querySelector('.reply-image-input');

                        if (replyInput.value || replyImageInput.files.length > 0) {
                            await addComment(postId, userId, replyInput.value, replyImageInput.files[0], commentDoc.id);
                            replyInput.value = '';
                            replyImageInput.value = '';
                            await loadComments(postId, repliesContainer, userId, commentDoc.id);
                        }
                    });
                });

                // Cargar respuestas al comentario
                await loadComments(postId, repliesContainer, userId, commentDoc.id);
            }

            commentsList.appendChild(commentElement);
        }
    });
}
