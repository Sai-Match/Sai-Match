import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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
const adminStatus = document.getElementById("adminStatus");
const reportsList = document.getElementById("reportsList");
const ngWordsTextarea = document.getElementById("ngWords");
const saveNgWordsButton = document.getElementById("saveNgWords");

function formatReportDate(createdAt) {
    const date = createdAt?.toDate
        ? createdAt.toDate()
        : createdAt instanceof Date
            ? createdAt
            : new Date(createdAt);
    return Number.isFinite(date.getTime())
        ? date.toLocaleDateString("ja-JP")
        : "日時不明";
}

function renderReports(reportDocs) {
    reportsList.replaceChildren();
    if (reportDocs.length === 0) {
        reportsList.textContent = "通報はありません";
        return;
    }

    reportDocs.forEach((reportDoc) => {
        const report = reportDoc.data();
        const item = document.createElement("article");
        const reason = document.createElement("h3");
        reason.textContent = report.reason || "理由なし";
        const users = document.createElement("p");
        users.textContent =
            `${report.reporterId || "不明"} → ${report.targetUserId || "不明"}`;
        const detail = document.createElement("p");
        detail.textContent = report.detail || "";
        const date = document.createElement("time");
        date.textContent = formatReportDate(report.createdAt);
        const status = document.createElement("p");
        status.textContent = `状態: ${report.status || "不明"}`;
        item.append(reason, users, detail, date, status);
        reportsList.append(item);
    });
}

onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        window.location.href = "/";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists() || userDoc.data().isAdmin !== true) {
            window.location.href = "/";
            return;
        }

        const [reportsSnapshot, settingsSnapshot] = await Promise.all([
            getDocs(collection(db, "reports")),
            getDoc(doc(db, "settings", "moderation"))
        ]);
        renderReports(reportsSnapshot.docs);

        const ngWords = settingsSnapshot.exists()
            ? settingsSnapshot.data()?.ngWords
            : [];
        ngWordsTextarea.value = Array.isArray(ngWords)
            ? ngWords.filter((word) => typeof word === "string").join("\n")
            : "";
        ngWordsTextarea.disabled = false;
        saveNgWordsButton.disabled = false;
        adminStatus.textContent = "";
    } catch (error) {
        adminStatus.textContent = `読み込みに失敗しました: ${error.message}`;
    }
});

saveNgWordsButton.addEventListener("click", async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        window.location.href = "/";
        return;
    }

    saveNgWordsButton.disabled = true;
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists() || userDoc.data().isAdmin !== true) {
            window.location.href = "/";
            return;
        }

        await setDoc(doc(db, "settings", "moderation"), {
            ngWords: ngWordsTextarea.value
                .split("\n")
                .map((word) => word.trim())
                .filter(Boolean)
        });
        adminStatus.textContent = "NGワードを保存しました";
    } catch (error) {
        adminStatus.textContent = `保存に失敗しました: ${error.message}`;
    } finally {
        saveNgWordsButton.disabled = false;
    }
});
