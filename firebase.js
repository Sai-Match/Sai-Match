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
    addDoc,
    query,
    where,
    arrayUnion,
    orderBy,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

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
const storage = getStorage(app);
let registrationInProgress = false;
let users = [];
let currentIndex = 0;
let currentMode = null;
let activeMatch = null;
let unsubscribeMessages = null;

console.log("Firebase接続成功");

function stopListeningToMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    activeMatch = null;
}

function hideModePages() {
    document.getElementById("modeSelectPage").classList.add("hidden");
    document.getElementById("relationshipProfilePage").classList.add("hidden");
    document.getElementById("studyProfilePage").classList.add("hidden");
}

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
                    department: "",
                    grade: "",
                    bio: "",
                    profileImageUrl: "",
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

        const department =
            document.getElementById("department").value;

        const grade =
            document.getElementById("grade").value;

        const bio =
            document.getElementById("bio").value;

        const imageFile =
            document.getElementById("profileImage").files[0];

        try {

            const profileSnapshot =
                await getDoc(doc(db, "users", user.uid));
            let imageUrl =
                profileSnapshot.exists()
                    ? profileSnapshot.data().profileImageUrl || ""
                    : "";
            if (imageFile) {
                const imageRef = ref(storage, "profiles/" + user.uid);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);
            }

            await updateDoc(
                doc(db, "users", user.uid),
                {
                    nickname: nickname,
                    faculty: faculty,
                    department: department,
                    grade: grade,
                    bio: bio,
                    profileImageUrl: imageUrl
                }
            );

            registrationInProgress = false;
            alert("プロフィール保存成功");

            showModeSelect();

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
    stopListeningToMessages();
    document.getElementById("currentUser").textContent = "";
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("mainNavigation").classList.add("hidden");
}

async function showProfile(user, profileData = null, showNavigation = false) {
    stopListeningToMessages();
    if (profileData === null) {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    }

    document.getElementById("currentUser").textContent =
        `ログイン中: ${user.email || ""}`;
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("profileForm").classList.remove("hidden");
    document.getElementById("nickname").value = profileData.nickname || "";
    document.getElementById("faculty").value = profileData.faculty || "";
    document.getElementById("department").value = profileData.department || "";
    document.getElementById("grade").value = profileData.grade || "";
    document.getElementById("bio").value = profileData.bio || "";
    document.getElementById("profileImage").value = "";
    document.getElementById("profileFormTitle").textContent =
        showNavigation ? "プロフィール編集" : "プロフィール登録";
    document.getElementById("mainNavigation").classList.toggle("hidden", !showNavigation);
}

async function showUserList(user, mode = currentMode) {
    if (!user || !mode || !["relationship", "study"].includes(mode)) {
        showModeSelect();
        return;
    }

    currentMode = mode;
    const modeProfileSnapshot = await getDoc(
        doc(db, `${mode}Profiles`, user.uid)
    );
    if (auth.currentUser?.uid !== user.uid || currentMode !== mode) {
        return;
    }

    if (!modeProfileSnapshot.exists()) {
        hideModePages();
        document.getElementById("matchListPage").classList.add("hidden");
        document.getElementById("matchProfilePage").classList.add("hidden");
        document.getElementById("chatPage").classList.add("hidden");
        document.getElementById(
            mode === "relationship"
                ? "relationshipProfilePage"
                : "studyProfilePage"
        ).classList.remove("hidden");
        document.getElementById("mainNavigation").classList.remove("hidden");
        return;
    }

    stopListeningToMessages();
    document.getElementById("currentUser").textContent =
        `ログイン中: ${user.email || ""}`;
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("userListPage").classList.remove("hidden");
    document.getElementById("mainNavigation").classList.remove("hidden");
    await loadModeUsers();
}

function showModeSelect() {
    stopListeningToMessages();
    currentMode = null;
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("modeSelectPage").classList.remove("hidden");
    document.getElementById("mainNavigation").classList.remove("hidden");
}

async function openRelationshipMode() {
    const user = auth.currentUser;
    if (!user) {
        alert("ログインしてください");
        return;
    }

    try {
        currentMode = "relationship";
        const profileSnapshot = await getDoc(
            doc(db, "relationshipProfiles", user.uid)
        );
        if (
            auth.currentUser?.uid !== user.uid ||
            currentMode !== "relationship"
        ) {
            return;
        }

        if (!profileSnapshot.exists()) {
            hideModePages();
            document.getElementById("matchListPage").classList.add("hidden");
            document.getElementById("matchProfilePage").classList.add("hidden");
            document.getElementById("chatPage").classList.add("hidden");
            document.getElementById("relationshipProfilePage").classList.remove("hidden");
            return;
        }

        await showUserList(user, "relationship");
    } catch (error) {
        alert(error.message);
    }
}

async function openStudyMode() {
    const user = auth.currentUser;
    if (!user) {
        alert("ログインしてください");
        return;
    }

    try {
        currentMode = "study";
        const profileSnapshot = await getDoc(
            doc(db, "studyProfiles", user.uid)
        );
        if (
            auth.currentUser?.uid !== user.uid ||
            currentMode !== "study"
        ) {
            return;
        }

        if (!profileSnapshot.exists()) {
            hideModePages();
            document.getElementById("matchListPage").classList.add("hidden");
            document.getElementById("matchProfilePage").classList.add("hidden");
            document.getElementById("chatPage").classList.add("hidden");
            document.getElementById("studyProfilePage").classList.remove("hidden");
            return;
        }

        await showUserList(user, "study");
    } catch (error) {
        alert(error.message);
    }
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

        if (
            !profile?.nickname ||
            !profile.faculty ||
            !profile.department ||
            !profile.grade
        ) {
            await showProfile(user, profile);
            return;
        }

        showModeSelect();
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

document
    .getElementById("homeNavBtn")
    .addEventListener("click", showModeSelect);

document
    .getElementById("matchesNavBtn")
    .addEventListener("click", showMatchList);

document
    .getElementById("profileNavBtn")
    .addEventListener("click", async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                await showProfile(user, null, true);
            } catch (error) {
                alert(error.message);
            }
        }
    });

document
    .getElementById("relationshipModeBtn")
    .addEventListener("click", openRelationshipMode);

document
    .getElementById("studyModeBtn")
    .addEventListener("click", openStudyMode);

document
    .getElementById("saveRelationshipProfileBtn")
    .addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("ログインしてください");
            return;
        }

        const goal = document.getElementById("relationshipGoal").value;
        const weekendStyle = document.getElementById("weekendStyle").value.trim();
        const idealPartner = document.getElementById("idealPartner").value.trim();
        if (!goal || !weekendStyle || !idealPartner) {
            alert("人間関係プロフィールの項目をすべて入力してください");
            return;
        }

        try {
            await setDoc(
                doc(db, "relationshipProfiles", user.uid),
                {
                    goal,
                    weekendStyle,
                    idealPartner
                }
            );
            alert("保存完了");
            await showUserList(user, "relationship");
        } catch (error) {
            alert(error.message);
        }
    });

document
    .getElementById("saveStudyProfileBtn")
    .addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("ログインしてください");
            return;
        }

        const studyTopic = document.getElementById("studyTopic").value.trim();
        const studyFrequency = document.getElementById("studyFrequency").value;
        const studyGoal = document.getElementById("studyGoal").value.trim();
        if (!studyTopic || !studyFrequency || !studyGoal) {
            alert("学習プロフィールの項目をすべて入力してください");
            return;
        }

        try {
            await setDoc(
                doc(db, "studyProfiles", user.uid),
                {
                    studyTopic,
                    studyFrequency,
                    studyGoal
                }
            );
            alert("保存完了");
            await showUserList(user, "study");
        } catch (error) {
            alert(error.message);
        }
    });


// ====================
// ユーザー一覧
// ====================

async function loadModeUsers() {

    const currentUser = auth.currentUser;
    const mode = currentMode;

    if (!currentUser || !mode) {
        showModeSelect();
        return;
    }

    try {
        const [modeProfiles, passes] = await Promise.all([
            getDocs(collection(db, `${mode}Profiles`)),
            getDocs(query(
                collection(db, "passes"),
                where("fromUserId", "==", currentUser.uid),
                where("mode", "==", mode)
            ))
        ]);

        if (
            auth.currentUser?.uid !== currentUser.uid ||
            currentMode !== mode
        ) {
            return;
        }

        if (!modeProfiles.docs.some((profileDoc) => profileDoc.id === currentUser.uid)) {
            await showUserList(currentUser, mode);
            return;
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const passedUserIds = new Set();
        passes.forEach((passDoc) => {
            const pass = passDoc.data();
            const createdAt = pass.createdAt?.toDate
                ? pass.createdAt.toDate()
                : new Date(pass.createdAt);
            if (
                pass.toUserId &&
                Number.isFinite(createdAt.getTime()) &&
                createdAt > cutoff
            ) {
                passedUserIds.add(pass.toUserId);
            }
        });

        currentIndex = 0;
        const candidateProfiles = await Promise.all(
            modeProfiles.docs
                .filter((profileDoc) =>
                    profileDoc.id !== currentUser.uid &&
                    !passedUserIds.has(profileDoc.id)
                )
                .map(async (profileDoc) => {
                    const userSnapshot = await getDoc(
                        doc(db, "users", profileDoc.id)
                    );
                    if (!userSnapshot.exists()) {
                        return null;
                    }
                    return {
                        id: userSnapshot.id,
                        ...userSnapshot.data()
                    };
                })
        );

        if (
            auth.currentUser?.uid !== currentUser.uid ||
            currentMode !== mode
        ) {
            return;
        }

        users = candidateProfiles.filter((profile) => profile !== null);

        showCurrentUser();

    } catch (error) {

        alert(error.message);

    }
}

async function showMatchList() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("ログインしてください");
        return;
    }

    stopListeningToMessages();
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    hideModePages();
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("matchListPage").classList.remove("hidden");
    document.getElementById("mainNavigation").classList.remove("hidden");

    const matchList = document.getElementById("matchList");
    matchList.textContent = "読み込み中...";

    try {
        const [user1Matches, user2Matches] = await Promise.all([
            getDocs(query(
                collection(db, "matches"),
                where("user1", "==", currentUser.uid)
            )),
            getDocs(query(
                collection(db, "matches"),
                where("user2", "==", currentUser.uid)
            ))
        ]);

        if (auth.currentUser?.uid !== currentUser.uid) {
            return;
        }

        const matchesById = new Map();
        [...user1Matches.docs, ...user2Matches.docs].forEach((matchDoc) => {
            matchesById.set(matchDoc.id, {
                id: matchDoc.id,
                ...matchDoc.data()
            });
        });

        const matchesByPartner = new Map();
        matchesById.forEach((match) => {
            const partnerId =
                match.user1 === currentUser.uid ? match.user2 : match.user1;
            if (partnerId) {
                const existing = matchesByPartner.get(partnerId);
                const modes = new Set([
                    ...(Array.isArray(existing?.match.modes)
                        ? existing.match.modes
                        : []),
                    ...(Array.isArray(match.modes) ? match.modes : [])
                ]);
                matchesByPartner.set(partnerId, {
                    match: {
                        ...(existing?.match || match),
                        modes: [...modes]
                    },
                    partnerId
                });
            }
        });

        const matchesWithProfiles = await Promise.all(
            [...matchesByPartner.values()].map(async ({ match, partnerId }) => {
                const profileSnapshot = await getDoc(doc(db, "users", partnerId));
                return {
                    match,
                    partnerId,
                    profile: profileSnapshot.exists()
                        ? profileSnapshot.data()
                        : {}
                };
            })
        );

        if (auth.currentUser?.uid !== currentUser.uid) {
            return;
        }

        matchList.replaceChildren();
        if (matchesWithProfiles.length === 0) {
            matchList.textContent = "マッチはまだありません";
            return;
        }

        matchesWithProfiles.forEach(({ match, partnerId, profile }) => {
            const card = document.createElement("div");
            card.className = "matchCard";

            const image = document.createElement("img");
            image.alt = "プロフィール画像";
            if (profile.profileImageUrl) {
                image.src = profile.profileImageUrl;
            } else {
                image.classList.add("hidden");
            }

            const info = document.createElement("div");
            info.className = "matchCardInfo";
            const modeLabel = document.createElement("div");
            modeLabel.textContent = (match.modes || [])
                .map((mode) => {
                    if (mode === "relationship") {
                        return "❤️";
                    }
                    if (mode === "study") {
                        return "📚";
                    }
                    return "";
                })
                .join("");
            const name = document.createElement("strong");
            name.textContent = profile.nickname || "名前未設定";
            info.append(modeLabel, name);

            const profileButton = document.createElement("button");
            profileButton.type = "button";
            profileButton.textContent = "プロフィール";
            profileButton.addEventListener("click", () => {
                showMatchProfile(profile);
            });

            const chatButton = document.createElement("button");
            chatButton.type = "button";
            chatButton.textContent = "チャット";
            chatButton.addEventListener("click", () => {
                openChat(match, partnerId, profile.nickname || "チャット");
            });

            const actions = document.createElement("div");
            actions.className = "matchCardActions";
            actions.append(profileButton, chatButton);
            card.append(image, info, actions);
            matchList.append(card);
        });
    } catch (error) {
        matchList.textContent = "";
        alert(error.message);
    }
}

function showMatchProfile(profile) {
    stopListeningToMessages();
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.remove("hidden");

    const image = document.getElementById("matchProfileImage");
    if (profile.profileImageUrl) {
        image.src = profile.profileImageUrl;
        image.classList.remove("hidden");
    } else {
        image.removeAttribute("src");
        image.classList.add("hidden");
    }

    document.getElementById("matchProfileNickname").textContent =
        profile.nickname || "名前未設定";
    document.getElementById("matchProfileFaculty").textContent =
        profile.faculty || "";
    document.getElementById("matchProfileDepartment").textContent =
        profile.department || "";
    document.getElementById("matchProfileGrade").textContent =
        profile.grade ? `${profile.grade}年` : "";
    document.getElementById("matchProfileBio").textContent =
        profile.bio || "";
}

document
    .getElementById("backToMatchListBtn")
    .addEventListener("click", () => {
        document.getElementById("matchProfilePage").classList.add("hidden");
        document.getElementById("matchListPage").classList.remove("hidden");
    });

function openChat(match, partnerId, partnerName) {
    activeMatch = { id: match.id, partnerId, partnerName };
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("chatPage").classList.remove("hidden");
    document.getElementById("mainNavigation").classList.add("hidden");
    document.getElementById("chatPartnerName").textContent = partnerName;
    document.getElementById("chatMessages").textContent = "読み込み中...";

    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const messagesQuery = query(
        collection(db, "matches", match.id, "messages"),
        orderBy("createdAt", "asc")
    );
    unsubscribeMessages = onSnapshot(
        messagesQuery,
        (snapshot) => {
            renderMessages(snapshot.docs);
        },
        (error) => {
            alert(error.message);
        }
    );
}

function renderMessages(messageDocs) {
    const currentUser = auth.currentUser;
    const messages = document.getElementById("chatMessages");
    messages.replaceChildren();

    if (messageDocs.length === 0) {
        messages.textContent = "メッセージはまだありません";
        return;
    }

    messageDocs.forEach((messageDoc) => {
        const message = messageDoc.data();
        const item = document.createElement("div");
        item.className = "chatMessage";
        const sender = document.createElement("strong");
        sender.textContent =
            message.senderId === currentUser?.uid
                ? "あなた"
                : activeMatch?.partnerName || "相手";
        const text = document.createElement("div");
        text.textContent = message.text || "";
        item.append(sender, text);

        if (message.createdAt?.toDate) {
            const time = document.createElement("time");
            time.className = "chatMessageTime";
            time.dateTime = message.createdAt.toDate().toISOString();
            time.textContent = message.createdAt.toDate().toLocaleString("ja-JP");
            item.append(time);
        }

        messages.append(item);
    });
    messages.scrollTop = messages.scrollHeight;
}

document
    .getElementById("backToMatchesBtn")
    .addEventListener("click", showMatchList);

document
    .getElementById("sendMessageBtn")
    .addEventListener("click", async (event) => {
        const currentUser = auth.currentUser;
        const text = document.getElementById("messageInput").value.trim();
        if (!currentUser || !activeMatch || !text) {
            return;
        }

        const sendButton = event.currentTarget;
        sendButton.disabled = true;
        try {
            await addDoc(
                collection(db, "matches", activeMatch.id, "messages"),
                {
                    senderId: currentUser.uid,
                    text,
                    createdAt: new Date()
                }
            );
            document.getElementById("messageInput").value = "";
        } catch (error) {
            alert(error.message);
        } finally {
            sendButton.disabled = false;
        }
    });

document
    .getElementById("loadUsersBtn")
    .addEventListener("click", loadModeUsers);

function showCurrentUser() {

    const nicknameView = document.getElementById("nicknameView");
    const facultyView = document.getElementById("facultyView");
    const departmentView = document.getElementById("departmentView");
    const gradeView = document.getElementById("gradeView");
    const bioView = document.getElementById("bioView");
    const profileImageView = document.getElementById("profileImageView");
    const passButton = document.getElementById("passBtn");
    const likeButton = document.getElementById("likeBtn");

    passButton.disabled = true;
    likeButton.disabled = true;

    if (users.length === 0) {
        nicknameView.textContent = "ユーザーがいません";
        facultyView.textContent = "";
        departmentView.textContent = "";
        gradeView.textContent = "";
        bioView.textContent = "";
        profileImageView.removeAttribute("src");
        profileImageView.classList.add("hidden");
        return;
    }

    if (currentIndex >= users.length) {
        nicknameView.textContent = "全員見終わりました";
        facultyView.textContent = "";
        departmentView.textContent = "";
        gradeView.textContent = "";
        bioView.textContent = "";
        profileImageView.removeAttribute("src");
        profileImageView.classList.add("hidden");
        return;
    }

    const user = users[currentIndex];
    nicknameView.textContent = user.nickname || "";
    facultyView.textContent = user.faculty || "";
    departmentView.textContent = user.department || "";
    gradeView.textContent = `${user.grade || ""}年`;
    bioView.textContent = user.bio || "";
    if (user.profileImageUrl) {
        profileImageView.src = user.profileImageUrl;
        profileImageView.classList.remove("hidden");
    } else {
        profileImageView.removeAttribute("src");
        profileImageView.classList.add("hidden");
    }
    passButton.disabled = false;
    likeButton.disabled = false;
}

document
    .getElementById("passBtn")
    .addEventListener("click", async (event) => {
        const currentUser = auth.currentUser;
        const targetUser = users[currentIndex];
        const mode = currentMode;

        if (!currentUser || !targetUser || !mode) {
            showModeSelect();
            return;
        }

        const passButton = event.currentTarget;
        passButton.disabled = true;
        try {
            await addDoc(collection(db, "passes"), {
                fromUserId: currentUser.uid,
                toUserId: targetUser.id,
                mode,
                createdAt: new Date()
            });

            if (
                auth.currentUser?.uid !== currentUser.uid ||
                currentMode !== mode
            ) {
                return;
            }

            currentIndex++;
            showCurrentUser();
        } catch (error) {
            alert(error.message);
            showCurrentUser();
        }
    });

document
    .getElementById("likeBtn")
    .addEventListener("click", async (event) => {

        const currentUser = auth.currentUser;
        const targetUser = users[currentIndex];
        const mode = currentMode;

        if (!currentUser || !targetUser || !mode) {
            alert("いいねするユーザーがいません");
            return;
        }

        const likeButton = event.currentTarget;
        likeButton.disabled = true;

        try {

            await addDoc(
                collection(db, "likes"),
                {
                    fromUserId: currentUser.uid,
                    toUserId: targetUser.id,
                    mode,
                    createdAt: new Date()
                }
            );

            const reverseQuery = query(
                collection(db, "likes"),
                where("fromUserId", "==", targetUser.id),
                where("toUserId", "==", currentUser.uid),
                where("mode", "==", mode)
            );
            const reverseLikes = await getDocs(reverseQuery);

            if (!reverseLikes.empty) {
                const [forwardMatches, reverseMatches] = await Promise.all([
                    getDocs(query(
                        collection(db, "matches"),
                        where("user1", "==", currentUser.uid),
                        where("user2", "==", targetUser.id)
                    )),
                    getDocs(query(
                        collection(db, "matches"),
                        where("user1", "==", targetUser.id),
                        where("user2", "==", currentUser.uid)
                    ))
                ]);
                const existingMatch =
                    forwardMatches.docs[0] || reverseMatches.docs[0];

                if (existingMatch) {
                    await updateDoc(
                        doc(db, "matches", existingMatch.id),
                        { modes: arrayUnion(mode) }
                    );
                } else {
                    await addDoc(
                        collection(db, "matches"),
                        {
                            user1: currentUser.uid,
                            user2: targetUser.id,
                            modes: [mode],
                            createdAt: new Date()
                        }
                    );
                }
                alert("🎉 マッチ成立！");
            }

            if (
                auth.currentUser?.uid !== currentUser.uid ||
                currentMode !== mode
            ) {
                return;
            }

            currentIndex++;
            showCurrentUser();

        } catch (error) {

            alert(error.message);
            showCurrentUser();

        }
    });