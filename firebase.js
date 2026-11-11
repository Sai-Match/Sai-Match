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
    onSnapshot,
    runTransaction
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
let unsubscribeActiveMatch = null;
const MAX_MESSAGES_PER_USER = 5;
const GENDER_LABELS = {
    male: "男性",
    female: "女性",
    other: "その他",
    no_answer: "回答しない"
};
const MODE_CONFIG = {
    relationship: {
        title: "人間関係",
        icon: "❤️",
        profilePageId: "relationshipProfilePage",
        fields: [
            {
                key: "targetGender",
                label: "表示したい性別",
                inputId: "targetGender",
                displayValues: {
                    male: "男性",
                    female: "女性",
                    both: "どちらも"
                }
            },
            {
                key: "goal",
                label: "募集目的",
                inputId: "relationshipGoal",
                displayValues: {
                    friend: "友達募集",
                    lover: "恋人募集",
                    both: "両方"
                }
            },
            { key: "weekendStyle", label: "休日", inputId: "weekendStyle" },
            {
                key: "idealPartner",
                label: "どんな人と会いたい？",
                inputId: "idealPartner"
            }
        ]
    },
    study: {
        title: "学習",
        icon: "📚",
        profilePageId: "studyProfilePage",
        fields: [
            { key: "studyTopic", label: "学習内容", inputId: "studyTopic" },
            {
                key: "studyFrequency",
                label: "頻度",
                inputId: "studyFrequency",
                displayValues: {
                    week1: "週1回",
                    week2: "週2回",
                    week3: "週3回以上"
                }
            },
            { key: "studyGoal", label: "目標", inputId: "studyGoal" }
        ]
    },
    hobby: {
        title: "趣味",
        icon: "🎮",
        profilePageId: "hobbyProfilePage",
        fields: [
            { key: "hobby", label: "好きな趣味", inputId: "hobby" },
            {
                key: "frequency",
                label: "活動頻度",
                inputId: "hobbyFrequency"
            },
            {
                key: "activity",
                label: "一緒にやりたいこと",
                inputId: "hobbyActivity"
            }
        ]
    },
    career: {
        title: "就活",
        icon: "💼",
        profilePageId: "careerProfilePage",
        fields: [
            {
                key: "graduateYear",
                label: "卒業年度",
                inputId: "graduateYear"
            },
            { key: "industry", label: "志望業界", inputId: "industry" },
            {
                key: "consultation",
                label: "相談したい内容",
                inputId: "consultation"
            }
        ]
    },
    exchange: {
        title: "国際交流",
        icon: "🌏",
        profilePageId: "exchangeProfilePage",
        fields: [
            {
                key: "exchangeType",
                label: "属性",
                inputId: "exchangeType",
                displayValues: {
                    international: "留学生",
                    japanese: "日本人学生"
                }
            },
            {
                key: "speakLanguages",
                label: "話せる言語",
                inputId: "exchangeSpeakLanguages",
                inputType: "checkboxes"
            },
            {
                key: "learnLanguages",
                label: "学びたい言語",
                inputId: "exchangeLearnLanguages",
                inputType: "checkboxes"
            },
            {
                key: "purpose",
                label: "国際交流目的",
                inputId: "exchangePurpose"
            }
        ]
    }
};

console.log("Firebase接続成功");

function stopListeningToMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    if (unsubscribeActiveMatch) {
        unsubscribeActiveMatch();
        unsubscribeActiveMatch = null;
    }
    activeMatch = null;
}

function hideModePages() {
    document.getElementById("modeSelectPage").classList.add("hidden");
    Object.values(MODE_CONFIG).forEach(({ profilePageId }) => {
        document.getElementById(profilePageId).classList.add("hidden");
    });
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

        const passwordConfirm =
            document.getElementById("registerPasswordConfirm").value;
        if (password !== passwordConfirm) {
            alert("パスワードが一致しません");
            return;
        }

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
                    gender: "",
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

        const gender =
            document.getElementById("gender").value;

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
                    gender,
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
    document.getElementById("gender").value = profileData.gender || "";
    document.getElementById("grade").value = profileData.grade || "";
    document.getElementById("bio").value = profileData.bio || "";
    document.getElementById("profileImage").value = "";
    document.getElementById("profileFormTitle").textContent =
        showNavigation ? "プロフィール編集" : "プロフィール登録";
    document.getElementById("mainNavigation").classList.toggle("hidden", !showNavigation);
}

async function showUserList(user, mode = currentMode) {
    if (!user || !MODE_CONFIG[mode]) {
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
        showModeProfileForm(mode);
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

function showModeProfileForm(mode, profileData = {}, isEditing = false) {
    stopListeningToMessages();
    hideModePages();
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("chatPage").classList.add("hidden");
    const config = MODE_CONFIG[mode];
    config.fields.forEach((field) => {
        if (field.inputType === "checkboxes") {
            const selectedValues = Array.isArray(profileData[field.key])
                ? profileData[field.key]
                : [];
            document
                .querySelectorAll(`input[name="${field.inputId}"]`)
                .forEach((input) => {
                    input.checked = selectedValues.includes(input.value);
                });
        } else {
            document.getElementById(field.inputId).value =
                profileData[field.key] || "";
        }
    });
    document.getElementById(config.profilePageId)
        .querySelector("h2").textContent =
        `${config.title}モードプロフィール${isEditing ? "編集" : "登録"}`;
    document.getElementById(
        `save${mode[0].toUpperCase()}${mode.slice(1)}ProfileBtn`
    ).textContent = isEditing ? "更新" : "保存";
    document.getElementById(config.profilePageId).classList.remove("hidden");
    document.getElementById("mainNavigation").classList.remove("hidden");
}

async function editCurrentModeProfile() {
    const currentUser = auth.currentUser;
    const mode = currentMode;
    if (!currentUser || !MODE_CONFIG[mode]) {
        alert("編集するモードプロフィールがありません");
        return;
    }

    try {
        const profileSnapshot = await getDoc(
            doc(db, `${mode}Profiles`, currentUser.uid)
        );
        if (
            auth.currentUser?.uid !== currentUser.uid ||
            currentMode !== mode
        ) {
            return;
        }
        showModeProfileForm(
            mode,
            profileSnapshot.exists() ? profileSnapshot.data() : {},
            profileSnapshot.exists()
        );
    } catch (error) {
        alert(error.message);
    }
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

async function openMode(mode) {
    const user = auth.currentUser;
    if (!user) {
        alert("ログインしてください");
        return;
    }

    try {
        if (!MODE_CONFIG[mode]) {
            throw new Error("選択したモードは利用できません");
        }

        currentMode = mode;
        await showUserList(user, mode);
    } catch (error) {
        alert(error.message);
    }
}

document
    .getElementById("relationshipModeBtn")
    .addEventListener("click", () => openMode("relationship"));

document
    .getElementById("studyModeBtn")
    .addEventListener("click", () => openMode("study"));

document
    .getElementById("hobbyModeBtn")
    .addEventListener("click", () => openMode("hobby"));

document
    .getElementById("careerModeBtn")
    .addEventListener("click", () => openMode("career"));

document
    .getElementById("exchangeModeBtn")
    .addEventListener("click", () => openMode("exchange"));

Object.entries(MODE_CONFIG).forEach(([mode, config]) => {
    document
        .getElementById(`save${mode[0].toUpperCase()}${mode.slice(1)}ProfileBtn`)
        .addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user) {
                alert("ログインしてください");
                return;
            }

            const profile = {};
            for (const field of config.fields) {
                const value = field.inputType === "checkboxes"
                    ? [...document.querySelectorAll(
                        `input[name="${field.inputId}"]:checked`
                    )].map((input) => input.value)
                    : document.getElementById(field.inputId).value.trim();
                if (value.length === 0) {
                    alert(`${config.title}プロフィールの項目をすべて入力してください`);
                    return;
                }
                profile[field.key] = value;
            }

            try {
                await setDoc(
                    doc(db, `${mode}Profiles`, user.uid),
                    profile,
                    { merge: true }
                );
                alert("保存完了");
                await showUserList(user, mode);
            } catch (error) {
                alert(error.message);
            }
        });
});

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

// ====================
// ユーザー一覧
// ====================

function calculateExchangeMatch(myProfile, targetProfile) {
    const mySpeakLanguages = new Set(
        Array.isArray(myProfile.speakLanguages) ? myProfile.speakLanguages : []
    );
    const myLearnLanguages = new Set(
        Array.isArray(myProfile.learnLanguages) ? myProfile.learnLanguages : []
    );
    const targetSpeakLanguages = new Set(
        Array.isArray(targetProfile.speakLanguages)
            ? targetProfile.speakLanguages
            : []
    );
    const targetLearnLanguages = new Set(
        Array.isArray(targetProfile.learnLanguages)
            ? targetProfile.learnLanguages
            : []
    );
    const commonPoints = [];

    myLearnLanguages.forEach((language) => {
        if (targetSpeakLanguages.has(language)) {
            commonPoints.push({
                learner: "あなた",
                speaker: "相手",
                language
            });
        }
    });
    targetLearnLanguages.forEach((language) => {
        if (mySpeakLanguages.has(language)) {
            commonPoints.push({
                learner: "相手",
                speaker: "あなた",
                language
            });
        }
    });

    return {
        matchCount: commonPoints.length,
        score: commonPoints.length * 50,
        commonPoints
    };
}

async function loadModeUsers() {

    const currentUser = auth.currentUser;
    const mode = currentMode;

    if (!currentUser || !MODE_CONFIG[mode]) {
        showModeSelect();
        return;
    }

    try {
        const [modeProfiles, passes, blockedUsers] = await Promise.all([
            getDocs(collection(db, `${mode}Profiles`)),
            getDocs(query(
                collection(db, "passes"),
                where("fromUserId", "==", currentUser.uid),
                where("mode", "==", mode)
            )),
            getDocs(query(
                collection(db, "blocks"),
                where("fromUserId", "==", currentUser.uid)
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
        const currentModeProfile = modeProfiles.docs
            .find((profileDoc) => profileDoc.id === currentUser.uid)
            .data();
        const oppositeExchangeType = mode === "exchange"
            ? {
                japanese: "international",
                international: "japanese"
            }[currentModeProfile.exchangeType]
            : null;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const passedUserIds = new Set();
        const blockedUserIds = new Set(
            blockedUsers.docs.map((blockDoc) => blockDoc.data().toUserId)
        );
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
                    !blockedUserIds.has(profileDoc.id) &&
                    !passedUserIds.has(profileDoc.id) &&
                    (
                        mode !== "exchange" ||
                        (
                            oppositeExchangeType &&
                            profileDoc.data().exchangeType === oppositeExchangeType
                        )
                    )
                )
                .map(async (profileDoc) => {
                    const userSnapshot = await getDoc(
                        doc(db, "users", profileDoc.id)
                    );
                    if (!userSnapshot.exists()) {
                        return null;
                    }
                    const profile = {
                        id: userSnapshot.id,
                        ...userSnapshot.data()
                    };
                    if (
                        mode === "relationship" &&
                        ["male", "female"].includes(
                            currentModeProfile.targetGender
                        ) &&
                        profile.gender !== currentModeProfile.targetGender
                    ) {
                        return null;
                    }
                    if (mode === "exchange") {
                        const exchangeProfile = profileDoc.data();
                        const compatibility = calculateExchangeMatch(
                            currentModeProfile,
                            exchangeProfile
                        );
                        profile.exchangeProfile = exchangeProfile;
                        profile.exchangeMatchCount = compatibility.matchCount;
                        profile.exchangeMatchScore = compatibility.score;
                        profile.exchangeCommonPoints = compatibility.commonPoints;
                    }
                    return profile;
                })
        );

        if (
            auth.currentUser?.uid !== currentUser.uid ||
            currentMode !== mode
        ) {
            return;
        }

        users = candidateProfiles.filter((profile) => profile !== null);
        if (mode === "exchange") {
            users.sort((first, second) =>
                second.exchangeMatchCount - first.exchangeMatchCount
            );
        }

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
                .map((mode) => MODE_CONFIG[mode]?.icon || "")
                .join("");
            const name = document.createElement("strong");
            name.textContent = profile.nickname || "名前未設定";
            info.append(modeLabel, name);

            const unreadCount = Number(
                match.user1 === currentUser.uid
                    ? match.user1Unread
                    : match.user2Unread
            ) || 0;
            if (unreadCount > 0) {
                const badge = document.createElement("span");
                badge.className = "unreadBadge";
                badge.textContent = `🔴 ${unreadCount}件`;
                info.append(badge);
            }

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
    document.getElementById("matchProfileGender").textContent =
        GENDER_LABELS[profile.gender]
            ? `性別: ${GENDER_LABELS[profile.gender]}`
            : "";
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

async function openChat(match, partnerId, partnerName) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("ログインしてください");
        return;
    }

    stopListeningToMessages();
    activeMatch = { id: match.id, partnerId, partnerName };
    hideModePages();
    document.getElementById("matchListPage").classList.add("hidden");
    document.getElementById("matchProfilePage").classList.add("hidden");
    document.getElementById("userListPage").classList.add("hidden");
    document.getElementById("profileForm").classList.add("hidden");
    document.getElementById("chatPage").classList.remove("hidden");
    document.getElementById("mainNavigation").classList.add("hidden");
    document.getElementById("chatPartnerName").textContent = partnerName;
    document.getElementById("messageRemain").textContent =
        `残り送信回数 ${MAX_MESSAGES_PER_USER}/${MAX_MESSAGES_PER_USER}`;
    document.getElementById("messageRemain").dataset.remaining =
        String(MAX_MESSAGES_PER_USER);
    document.getElementById("messageLimitNotice").classList.add("hidden");
    document.getElementById("sendMessageBtn").disabled = false;
    document.getElementById("blockUserBtn").disabled = false;
    document.getElementById("chatMessages").textContent = "読み込み中...";

    const matchRef = doc(db, "matches", match.id);
    const unreadField = match.user1 === currentUser.uid
        ? "user1Unread"
        : "user2Unread";
    try {
        await runTransaction(db, async (transaction) => {
            const matchSnapshot = await transaction.get(matchRef);
            if (!matchSnapshot.exists()) {
                throw new Error("マッチ情報が見つかりません");
            }

            const matchData = matchSnapshot.data();
            const updates = { [unreadField]: 0 };
            [
                "user1Unread",
                "user2Unread",
                "user1MessageCount",
                "user2MessageCount"
            ].forEach((field) => {
                if (typeof matchData[field] !== "number") {
                    updates[field] = 0;
                }
            });
            transaction.update(matchRef, updates);
        });
    } catch (error) {
        alert(error.message);
    }

    if (
        auth.currentUser?.uid !== currentUser.uid ||
        activeMatch?.id !== match.id
    ) {
        return;
    }

    unsubscribeActiveMatch = onSnapshot(
        matchRef,
        (snapshot) => {
            if (snapshot.exists() && activeMatch?.id === match.id) {
                updateMessageLimitView(snapshot.data(), currentUser.uid);
            }
        },
        (error) => {
            alert(error.message);
        }
    );

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

function updateMessageLimitView(matchData, userId) {
    const countField = matchData.user1 === userId
        ? "user1MessageCount"
        : "user2MessageCount";
    const count = Math.max(0, Number(matchData[countField]) || 0);
    const remaining = Math.max(0, MAX_MESSAGES_PER_USER - count);
    const limitView = document.getElementById("messageRemain");
    limitView.textContent =
        `残り送信回数 ${remaining}/${MAX_MESSAGES_PER_USER}`;
    limitView.dataset.remaining = String(remaining);
    document.getElementById("messageLimitNotice").classList.toggle(
        "hidden",
        remaining > 0
    );
    document.getElementById("sendMessageBtn").disabled = remaining === 0;
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

        const matchId = activeMatch.id;
        const sendButton = event.currentTarget;
        sendButton.disabled = true;
        try {
            const matchRef = doc(db, "matches", matchId);
            const messageRef = doc(
                collection(db, "matches", matchId, "messages")
            );
            const remaining = await runTransaction(db, async (transaction) => {
                const matchSnapshot = await transaction.get(matchRef);
                if (!matchSnapshot.exists()) {
                    throw new Error("マッチ情報が見つかりません");
                }

                const matchData = matchSnapshot.data();
                let countField;
                let unreadField;
                if (matchData.user1 === currentUser.uid) {
                    countField = "user1MessageCount";
                    unreadField = "user2Unread";
                } else if (matchData.user2 === currentUser.uid) {
                    countField = "user2MessageCount";
                    unreadField = "user1Unread";
                } else {
                    throw new Error("このマッチにメッセージを送信できません");
                }

                const messageCount = Math.max(
                    0,
                    Number(matchData[countField]) || 0
                );
                if (messageCount >= MAX_MESSAGES_PER_USER) {
                    return null;
                }

                transaction.set(messageRef, {
                    senderId: currentUser.uid,
                    text,
                    createdAt: new Date()
                });
                transaction.update(matchRef, {
                    [countField]: messageCount + 1,
                    [unreadField]: (Number(matchData[unreadField]) || 0) + 1
                });
                return MAX_MESSAGES_PER_USER - messageCount - 1;
            });

            if (remaining === null) {
                const matchSnapshot = await getDoc(matchRef);
                if (matchSnapshot.exists() && activeMatch?.id === matchId) {
                    updateMessageLimitView(matchSnapshot.data(), currentUser.uid);
                }
                alert("送信上限に達しました");
                return;
            }

            if (activeMatch?.id === matchId) {
                const limitView = document.getElementById("messageRemain");
                limitView.textContent =
                    `残り送信回数 ${remaining}/${MAX_MESSAGES_PER_USER}`;
                limitView.dataset.remaining = String(remaining);
                document.getElementById("messageLimitNotice").classList.toggle(
                    "hidden",
                    remaining > 0
                );
                sendButton.disabled = remaining === 0;
                document.getElementById("messageInput").value = "";
            }
            if (remaining === 1) {
                alert("残り1回です。\n\n連絡先の交換はしましたか？");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            if (activeMatch?.id === matchId) {
                sendButton.disabled =
                    Number(document.getElementById("messageRemain").dataset.remaining) <= 0;
            }
        }
    });

document
    .getElementById("blockUserBtn")
    .addEventListener("click", async (event) => {
        const currentUser = auth.currentUser;
        const match = activeMatch;
        if (!currentUser || !match) {
            return;
        }

        const blockButton = event.currentTarget;
        blockButton.disabled = true;
        try {
            await addDoc(collection(db, "blocks"), {
                fromUserId: currentUser.uid,
                toUserId: match.partnerId,
                createdAt: new Date()
            });

            if (
                auth.currentUser?.uid === currentUser.uid &&
                activeMatch?.id === match.id
            ) {
                alert("ブロックしました");
                await showMatchList();
            }
        } catch (error) {
            alert(error.message);
            if (activeMatch?.id === match.id) {
                blockButton.disabled = false;
            }
        }
    });

document
    .getElementById("loadUsersBtn")
    .addEventListener("click", loadModeUsers);

document
    .getElementById("editModeProfileBtn")
    .addEventListener("click", editCurrentModeProfile);

function showCurrentUser() {

    const nicknameView = document.getElementById("nicknameView");
    const facultyView = document.getElementById("facultyView");
    const departmentView = document.getElementById("departmentView");
    const gradeView = document.getElementById("gradeView");
    const bioView = document.getElementById("bioView");
    const modeProfileArea = document.getElementById("modeProfileArea");
    const profileImageView = document.getElementById("profileImageView");
    const passButton = document.getElementById("passBtn");
    const likeButton = document.getElementById("likeBtn");

    passButton.disabled = true;
    likeButton.disabled = true;

    if (users.length === 0) {
        nicknameView.textContent = "ユーザーがいません";
        facultyView.textContent = "";
        departmentView.textContent = "";
        document.getElementById("genderView").textContent = "";
        gradeView.textContent = "";
        bioView.textContent = "";
        modeProfileArea.textContent = "";
        profileImageView.removeAttribute("src");
        profileImageView.classList.add("hidden");
        return;
    }

    if (currentIndex >= users.length) {
        nicknameView.textContent = "全員見終わりました";
        facultyView.textContent = "";
        departmentView.textContent = "";
        document.getElementById("genderView").textContent = "";
        gradeView.textContent = "";
        bioView.textContent = "";
        modeProfileArea.textContent = "";
        profileImageView.removeAttribute("src");
        profileImageView.classList.add("hidden");
        return;
    }

    const user = users[currentIndex];
    modeProfileArea.textContent = "";
    void loadModeProfile(user.id);
    nicknameView.textContent = user.nickname || "";
    facultyView.textContent = user.faculty || "";
    departmentView.textContent = user.department || "";
    document.getElementById("genderView").textContent =
        GENDER_LABELS[user.gender]
            ? `性別: ${GENDER_LABELS[user.gender]}`
            : "";
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

async function loadModeProfile(userId) {
    const area = document.getElementById("modeProfileArea");
    const mode = currentMode;
    const config = MODE_CONFIG[mode];

    if (!config) {
        area.textContent = "";
        return;
    }

    area.textContent = "読み込み中...";

    try {
        const profileDoc = await getDoc(
            doc(db, `${mode}Profiles`, userId)
        );
        if (currentMode !== mode || users[currentIndex]?.id !== userId) {
            return;
        }

        if (!profileDoc.exists()) {
            area.textContent = "プロフィール未登録";
            return;
        }

        const data = mode === "exchange" && users[currentIndex]?.exchangeProfile
            ? users[currentIndex].exchangeProfile
            : profileDoc.data();
        const heading = document.createElement("h4");
        heading.textContent = `${config.icon} ${config.title}モード`;
        area.replaceChildren(heading);

        if (mode === "exchange") {
            const compatibility = document.createElement("p");
            compatibility.textContent =
                `🌏 相性 ${Math.min(users[currentIndex].exchangeMatchScore, 100)}%`;
            area.append(compatibility);
        }

        config.fields.forEach(({ key, label, displayValues }) => {
            const paragraph = document.createElement("p");
            const value = data[key];
            const displayValue = Array.isArray(value)
                ? value.join("、")
                : displayValues?.[value] || value;
            paragraph.textContent =
                `${label}: ${displayValue || "未設定"}`;
            area.append(paragraph);
        });

        if (
            mode === "exchange" &&
            users[currentIndex].exchangeCommonPoints.length > 0
        ) {
            const commonPointsHeading = document.createElement("h4");
            commonPointsHeading.textContent = "✨ 共通ポイント";
            area.append(commonPointsHeading);

            users[currentIndex].exchangeCommonPoints.forEach((point) => {
                const paragraph = document.createElement("p");
                paragraph.textContent =
                    `${point.learner}は${point.language}を学びたい` +
                    `・${point.speaker}は${point.language}を話せます`;
                area.append(paragraph);
            });
        }
    } catch (error) {
        if (currentMode === mode && users[currentIndex]?.id === userId) {
            area.textContent = "プロフィールを読み込めませんでした";
            alert(error.message);
        }
    }
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
                    const matchRef = doc(db, "matches", existingMatch.id);
                    await runTransaction(db, async (transaction) => {
                        const matchSnapshot = await transaction.get(matchRef);
                        if (!matchSnapshot.exists()) {
                            throw new Error("マッチ情報が見つかりません");
                        }
                        const matchData = matchSnapshot.data();
                        const updates = {
                            modes: arrayUnion(mode)
                        };
                        [
                            "user1Unread",
                            "user2Unread",
                            "user1MessageCount",
                            "user2MessageCount"
                        ].forEach((field) => {
                            if (typeof matchData[field] !== "number") {
                                updates[field] = 0;
                            }
                        });
                        transaction.update(matchRef, updates);
                    });
                } else {
                    await addDoc(
                        collection(db, "matches"),
                        {
                            user1: currentUser.uid,
                            user2: targetUser.id,
                            modes: [mode],
                            user1Unread: 0,
                            user2Unread: 0,
                            user1MessageCount: 0,
                            user2MessageCount: 0,
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
