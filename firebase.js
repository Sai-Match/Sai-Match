import { initializeApp }
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    collection,
    getDocs,
    addDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyByNHgDn685QV2SYNSHjhP9pUM6qX3wVos",
    authDomain: "sai-match-ca3b1.firebaseapp.com",
    projectId: "sai-match-ca3b1",
    storageBucket: "sai-match-ca3b1.firebasestorage.app",
    messagingSenderId: "769433518324",
    appId: "1:769433518324:web:75de9d9ea210116b9bdea1",
    measurementId: "G-SF1R9LH0NR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let registrationInProgress = false;
let users = [];
let currentIndex = 0;

console.log("Firebase接続成功");

// ====================
// 新規登録
// ====================

document
    .getElementById("registerBtn")
    .addEventListener("click", async () => {

        const email =
            document.getElementById("registerEmail").value;

        const password =
            document.getElementById("registerPassword").value;

        registrationInProgress = true;

        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            await setDoc(
                doc(db, "users", user.uid),
                {
                    email: user.email,
                    nickname: "",
                    faculty: "",
                    grade: "",
                    createdAt: new Date()
                }
            );

            alert("登録成功");

            document
                .getElementById("registerForm")
                .classList.add("hidden");

            document
                .getElementById("profileForm")
                .classList.remove("hidden");

        } catch (error) {

            registrationInProgress = false;
            alert(error.message);

        }

    });


// ====================
// プロフィール保存
// ====================

document
    .getElementById("saveProfileBtn")
    .addEventListener("click", async () => {

        const user = auth.currentUser;

        if (!user) {
            alert("ログインしてください");
            return;
        }

        const nickname =
            document.getElementById("nickname").value;

        const faculty =
            document.getElementById("faculty").value;

        const grade =
            document.getElementById("grade").value;

        try {

            await updateDoc(
                doc(db, "users", user.uid),
                {
                    nickname: nickname,
                    faculty: faculty,
                    grade: grade
                }
            );

            registrationInProgress = false;
            alert("プロフィール保存成功");

            await showUserList(user);

        } catch (error) {

            alert(error.message);

        }
    });


// ====================
// ログイン
// ====================

document
    .getElementById("loginBtn")
    .addEventListener("click", async () => {

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            alert("ログイン成功");

        } catch (error) {

            alert(error.message);

        }

    });


// ====================
// 認証状態
// ====================

function showLogin() {
    document.getElementById("currentUser").textContent = "";
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
}

function showProfile(user) {
    document.getElementById("currentUser").textContent =
        `ログイン中: ${user.email || ""}`;
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("profileForm").classList.remove("hidden");
}

async function showUserList(user) {
    document.getElementById("currentUser").textContent =
        `ログイン中: ${user.email || ""}`;
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("userListPage").classList.remove("hidden");
    await loadUsers();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        registrationInProgress = false;
        showLogin();
        return;
    }

    if (registrationInProgress) {
        return;
    }

    try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        if (auth.currentUser?.uid !== user.uid) {
            return;
        }

        const profile = userSnapshot.exists() ? userSnapshot.data() : null;

        if (!profile?.nickname || !profile.faculty || !profile.grade) {
            showProfile(user);
            return;
        }

        await showUserList(user);
    } catch (error) {
        alert(error.message);
    }
});

document
    .getElementById("logoutBtn")
    .addEventListener("click", async () => {
        try {
            await signOut(auth);
        } catch (error) {
            alert(error.message);
        }
    });


// ====================
// ユーザー一覧
// ====================

async function loadUsers() {

    const currentUser = auth.currentUser;

    if (!currentUser) {
        alert("ログインしてください");
        return;
    }

    try {

        const querySnapshot =
            await getDocs(
                collection(db, "users")
            );

        if (auth.currentUser?.uid !== currentUser.uid) {
            return;
        }

        users = [];
        currentIndex = 0;

        querySnapshot.forEach((docSnap) => {

            if (docSnap.id === currentUser.uid) {
                return;
            }

            users.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        showCurrentUser();

    } catch (error) {

        alert(error.message);

    }
}

document
    .getElementById("loadUsersBtn")
    .addEventListener("click", loadUsers);

function showCurrentUser() {

    const nicknameView = document.getElementById("nicknameView");
    const facultyView = document.getElementById("facultyView");
    const gradeView = document.getElementById("gradeView");
    const passButton = document.getElementById("passBtn");
    const likeButton = document.getElementById("likeBtn");

    passButton.disabled = true;
    likeButton.disabled = true;

    if (users.length === 0) {
        nicknameView.textContent = "ユーザーがいません";
        facultyView.textContent = "";
        gradeView.textContent = "";
        return;
    }

    if (currentIndex >= users.length) {
        nicknameView.textContent = "全員見終わりました";
        facultyView.textContent = "";
        gradeView.textContent = "";
        return;
    }

    const user = users[currentIndex];
    nicknameView.textContent = user.nickname || "";
    facultyView.textContent = user.faculty || "";
    gradeView.textContent = `${user.grade || ""}年`;
    passButton.disabled = false;
    likeButton.disabled = false;
}

document
    .getElementById("passBtn")
    .addEventListener("click", () => {
        currentIndex++;
        showCurrentUser();
    });

document
    .getElementById("likeBtn")
    .addEventListener("click", async (event) => {

        const currentUser = auth.currentUser;
        const targetUser = users[currentIndex];

        if (!currentUser || !targetUser) {
            alert("いいねするユーザーがいません");
            return;
        }

        event.currentTarget.disabled = true;

        try {

            await addDoc(
                collection(db, "likes"),
                {
                    fromUserId: currentUser.uid,
                    toUserId: targetUser.id,
                    createdAt: new Date()
                }
            );

            currentIndex++;
            showCurrentUser();

        } catch (error) {

            alert(error.message);
            showCurrentUser();

        }
    });