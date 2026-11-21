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
    Timestamp,
    updateDoc,
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
const reportDetail = document.getElementById("reportDetail");
const reportDetailContent = document.getElementById("reportDetailContent");
const ngWordsTextarea = document.getElementById("ngWords");
const saveNgWordsButton = document.getElementById("saveNgWords");
const reportStatusSelect = document.getElementById("reportStatus");
const saveReportStatusButton = document.getElementById("saveReportStatus");
const moderationModes = [
    { key: "relationshipProfiles", label: "人間関係" },
    { key: "hobbyProfiles", label: "趣味" },
    { key: "exchangeProfiles", label: "交流" }
];
const gradeLabels = {
    B1: "学部1年",
    B2: "学部2年",
    B3: "学部3年",
    B4: "学部4年",
    M1: "修士1年",
    M2: "修士2年",
    D1: "博士1年",
    D2: "博士2年",
    D3: "博士3年"
};
const statusLabels = {
    open: "未対応",
    investigating: "対応中",
    resolved: "対応済み",
    rejected: "却下"
};
const userById = new Map();
const modesByUserId = new Map();
const reportedCountByUid = new Map();
let reports = [];
let selectedReportId = null;

function setStatus(message) {
    adminStatus.textContent = message;
}

function asDate(value) {
    if (value?.toDate) {
        return value.toDate();
    }
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function formatDate(value, includeTime = true) {
    const date = asDate(value);
    if (!date) {
        return "日時不明";
    }
    return new Intl.DateTimeFormat("ja-JP", includeTime
        ? { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }
        : { year: "numeric", month: "2-digit", day: "2-digit" }
    ).format(date);
}

function isSuspended(user) {
    if (user?.suspended !== true) {
        return false;
    }
    if (user.suspendedUntil == null) {
        return true;
    }
    const expiresAt = asDate(user.suspendedUntil);
    return !expiresAt || expiresAt.getTime() > Date.now();
}

function reporterUid(report) {
    return report.reporterUid || report.reporterId || "";
}

function targetUid(report) {
    return report.targetUid || report.targetUserId || "";
}

function reportStatus(report) {
    return statusLabels[report.status] ? report.status : "open";
}

function displayGrade(profile) {
    return gradeLabels[profile?.grade] || profile?.grade || "未登録";
}

function userModes(uid) {
    return modesByUserId.get(uid)?.join("・") || "未登録";
}

function reportCount(uid) {
    const reported = reportedCountByUid.get(uid) || 0;
    const savedCount = Number(userById.get(uid)?.reportCount) || 0;
    return Math.max(reported, savedCount);
}

function appendField(parent, label, value, className = "") {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value || "未登録";
    if (className) {
        description.className = className;
    }
    parent.append(term, description);
    return description;
}

function addProfileCard(parent, label, uid) {
    const profile = userById.get(uid) || {};
    const card = document.createElement("article");
    card.className = "person-card";
    const heading = document.createElement("h3");
    heading.textContent = label;
    card.append(heading);

    if (profile.profileImageUrl) {
        const image = document.createElement("img");
        image.src = profile.profileImageUrl;
        image.alt = `${profile.nickname || label}のプロフィール画像`;
        image.loading = "lazy";
        card.append(image);
    }

    const fields = document.createElement("dl");
    appendField(fields, "ニックネーム", profile.nickname);
    appendField(fields, "学年", displayGrade(profile));
    appendField(fields, "モード", userModes(uid));
    appendField(fields, "UID", uid);
    if (label === "対象者") {
        const facultyGrade = [profile.faculty, displayGrade(profile)]
            .filter(Boolean)
            .join("");
        appendField(fields, "学部・学年", facultyGrade);
        appendField(fields, "自己紹介", profile.bio);
        appendField(fields, "登録日", formatDate(profile.createdAt, false));
        appendField(
            fields,
            "最終ログイン",
            profile.lastLoginAt ? formatDate(profile.lastLoginAt) : "未記録"
        );

        const count = reportCount(uid);
        const countBadge = appendField(fields, "通報件数", `${count}件`);
        countBadge.classList.add("report-count");
        if (count >= 5) {
            countBadge.classList.add("danger");
        } else if (count >= 3) {
            countBadge.classList.add("warning");
        }
        appendField(fields, "アカウント状態", isSuspended(profile) ? "停止中" : "利用可能");
    }
    card.append(fields);
    parent.append(card);
}

function visibleReports() {
    const uidQuery = document.getElementById("uidSearch").value.trim().toLocaleLowerCase();
    const nicknameQuery = document.getElementById("nicknameSearch").value.trim().toLocaleLowerCase();
    const reasonQuery = document.getElementById("reasonSearch").value.trim().toLocaleLowerCase();
    const statusQuery = document.getElementById("statusFilter").value;
    const suspensionQuery = document.getElementById("suspensionFilter").value;

    return reports.filter((report) => {
        const reporterId = reporterUid(report);
        const targetId = targetUid(report);
        const reporter = userById.get(reporterId) || {};
        const target = userById.get(targetId) || {};
        const uidMatches = !uidQuery ||
            `${reporterId} ${targetId}`.toLocaleLowerCase().includes(uidQuery);
        const nicknameMatches = !nicknameQuery ||
            `${reporter.nickname || ""} ${target.nickname || ""}`
                .toLocaleLowerCase().includes(nicknameQuery);
        const reasonMatches = !reasonQuery ||
            String(report.reason || "").toLocaleLowerCase().includes(reasonQuery);
        const statusMatches = statusQuery === "all" ||
            reportStatus(report) === statusQuery;
        const suspensionMatches = suspensionQuery !== "suspended" ||
            isSuspended(target);
        return uidMatches && nicknameMatches && reasonMatches &&
            statusMatches && suspensionMatches;
    });
}

function renderReports() {
    reportsList.replaceChildren();
    const filteredReports = visibleReports();
    if (filteredReports.length === 0) {
        reportsList.textContent = "該当する通報はありません";
    } else {
        filteredReports.forEach((report) => {
            const card = document.createElement("article");
            card.className = "report-card";
            const heading = document.createElement("h3");
            heading.textContent = `${report.reportId || report.id} — ${report.reason || "理由なし"}`;
            const details = document.createElement("p");
            const reporter = userById.get(reporterUid(report)) || {};
            const target = userById.get(targetUid(report)) || {};
            details.textContent =
                `通報者: ${reporter.nickname || "未登録"} / ${displayGrade(reporter)} / ${userModes(reporterUid(report))} / UID: ${reporterUid(report) || "不明"}\n` +
                `対象者: ${target.nickname || "未登録"} / ${displayGrade(target)} / ${userModes(targetUid(report))}`;
            details.style.whiteSpace = "pre-wrap";
            const targetUidDisplay = document.createElement("p");
            targetUidDisplay.className = "user-uid";
            targetUidDisplay.textContent = `対象者UID: ${targetUid(report) || "不明"}`;
            const date = document.createElement("time");
            date.dateTime = asDate(report.createdAt)?.toISOString() || "";
            date.textContent = formatDate(report.createdAt);
            const status = document.createElement("p");
            status.textContent = `状態: ${statusLabels[reportStatus(report)]}`;
            const count = document.createElement("span");
            const totalReports = reportCount(targetUid(report));
            count.className = "report-count";
            if (totalReports >= 5) {
                count.classList.add("danger");
            } else if (totalReports >= 3) {
                count.classList.add("warning");
            }
            count.textContent = `対象者の通報件数: ${totalReports}件`;
            const completionLabel = document.createElement("label");
            completionLabel.className = "completion-control";
            const completionCheckbox = document.createElement("input");
            completionCheckbox.type = "checkbox";
            completionCheckbox.checked = reportStatus(report) === "resolved";
            completionCheckbox.setAttribute(
                "aria-label",
                `${report.reportId || report.id} 対応完了`
            );
            completionCheckbox.addEventListener("change", async () => {
                const previousStatus = reportStatus(report);
                completionCheckbox.disabled = true;
                try {
                    await persistReportStatus(
                        report,
                        completionCheckbox.checked ? "resolved" : "open"
                    );
                } catch (error) {
                    completionCheckbox.checked = previousStatus === "resolved";
                    setStatus(`状態の更新に失敗しました: ${error.message}`);
                } finally {
                    if (completionCheckbox.isConnected) {
                        completionCheckbox.disabled = false;
                    }
                }
            });
            completionLabel.append(
                completionCheckbox,
                document.createTextNode("対応完了")
            );
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "詳細";
            button.addEventListener("click", () => selectReport(report.id));
            card.append(
                heading,
                details,
                targetUidDisplay,
                date,
                status,
                count,
                completionLabel,
                button
            );
            reportsList.append(card);
        });
    }

    if (selectedReportId && reports.some((report) => report.id === selectedReportId)) {
        renderReportDetail();
    } else {
        reportDetail.hidden = true;
    }
}

function renderReportDetail() {
    const report = reports.find(({ id }) => id === selectedReportId);
    if (!report) {
        reportDetail.hidden = true;
        return;
    }

    reportDetail.hidden = false;
    reportDetailContent.replaceChildren();
    const fields = document.createElement("dl");
    fields.className = "report-data";
    appendField(fields, "通報ID", report.reportId || report.id);
    appendField(fields, "通報日時", formatDate(report.createdAt));
    appendField(fields, "状態", statusLabels[reportStatus(report)]);
    appendField(fields, "理由", report.reason || "理由なし");
    appendField(fields, "内容", report.detail || "記載なし");
    appendField(fields, "チャットID（マッチID）", report.matchId || "不明");
    reportDetailContent.append(fields);

    const people = document.createElement("div");
    people.className = "people-grid";
    addProfileCard(people, "通報者", reporterUid(report));
    addProfileCard(people, "対象者", targetUid(report));
    reportDetailContent.append(people);
    reportStatusSelect.value = reportStatus(report);
    const target = userById.get(targetUid(report));
    const actionButtons = reportDetail.querySelectorAll(
        "[data-suspend-hours], [data-suspend-days], [data-suspend-permanent]"
    );
    actionButtons.forEach((button) => {
        button.disabled = !target || !targetUid(report);
    });
}

function selectReport(reportId) {
    selectedReportId = reportId;
    renderReports();
    reportDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function requireAdmin() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        window.location.href = "/";
        throw new Error("ログインしてください");
    }
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists() || userDoc.data().isAdmin !== true) {
        window.location.href = "/";
        throw new Error("管理者権限がありません");
    }
}

async function loadAdminData() {
    setStatus("通報データを読み込み中...");
    const snapshots = await Promise.all([
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "users")),
        ...moderationModes.map(({ key }) => getDocs(collection(db, key))),
        getDoc(doc(db, "settings", "moderation"))
    ]);

    reports = snapshots[0].docs.map((reportDoc) => ({
        id: reportDoc.id,
        ...reportDoc.data()
    })).sort((first, second) =>
        (asDate(second.createdAt)?.getTime() || 0) -
        (asDate(first.createdAt)?.getTime() || 0)
    );
    reportedCountByUid.clear();
    reports.forEach((report) => {
        const uid = targetUid(report);
        if (uid) {
            reportedCountByUid.set(uid, (reportedCountByUid.get(uid) || 0) + 1);
        }
    });
    userById.clear();
    snapshots[1].docs.forEach((userDoc) => {
        userById.set(userDoc.id, userDoc.data());
    });
    modesByUserId.clear();
    moderationModes.forEach(({ key, label }, index) => {
        snapshots[index + 2].docs.forEach((profileDoc) => {
            const modes = modesByUserId.get(profileDoc.id) || [];
            modes.push(label);
            modesByUserId.set(profileDoc.id, modes);
        });
    });

    const settingsSnapshot = snapshots[snapshots.length - 1];
    const ngWords = settingsSnapshot.exists()
        ? settingsSnapshot.data()?.ngWords
        : [];
    ngWordsTextarea.value = Array.isArray(ngWords)
        ? ngWords.filter((word) => typeof word === "string").join("\n")
        : "";
    ngWordsTextarea.disabled = false;
    saveNgWordsButton.disabled = false;
    renderReports();
    setStatus("");
}

async function updateSuspension(durationMs, description) {
    const report = reports.find(({ id }) => id === selectedReportId);
    const uid = report ? targetUid(report) : "";
    if (!uid || !confirm(`${description}を実行しますか？`)) {
        return;
    }

    try {
        await requireAdmin();
        const targetRef = doc(db, "users", uid);
        const targetDoc = await getDoc(targetRef);
        if (!targetDoc.exists()) {
            throw new Error("対象ユーザーが見つかりません");
        }
        if (targetDoc.data().isAdmin === true) {
            throw new Error("管理者アカウントは停止できません");
        }
        const suspendedUntil = durationMs === null
            ? null
            : Timestamp.fromDate(new Date(Date.now() + durationMs));
        await updateDoc(targetRef, {
            suspended: true,
            suspendedUntil
        });
        userById.set(uid, {
            ...userById.get(uid),
            suspended: true,
            suspendedUntil
        });
        renderReports();
        setStatus(`${description}を実行しました`);
    } catch (error) {
        setStatus(`${description}に失敗しました: ${error.message}`);
    }
}

document.querySelectorAll("[data-suspend-hours]").forEach((button) => {
    button.addEventListener("click", async () => {
        const hours = Number(button.dataset.suspendHours);
        await updateSuspension(
            hours * 60 * 60 * 1000,
            `${hours}時間停止`
        );
    });
});

document.querySelectorAll("[data-suspend-days]").forEach((button) => {
    button.addEventListener("click", async () => {
        const days = Number(button.dataset.suspendDays);
        await updateSuspension(
            days * 24 * 60 * 60 * 1000,
            `${days}日停止`
        );
    });
});

document.querySelector("[data-suspend-permanent]")
    .addEventListener("click", async () => {
        await updateSuspension(
            null,
            "永久停止"
        );
    });

async function persistReportStatus(report, status) {
    await requireAdmin();
    await updateDoc(doc(db, "reports", report.id), {
        status
    });
    report.status = status;
    renderReports();
    setStatus("通報状態を更新しました");
}

saveReportStatusButton.addEventListener("click", async () => {
    const report = reports.find(({ id }) => id === selectedReportId);
    if (!report) {
        return;
    }
    saveReportStatusButton.disabled = true;
    try {
        await persistReportStatus(report, reportStatusSelect.value);
    } catch (error) {
        setStatus(`状態の更新に失敗しました: ${error.message}`);
    } finally {
        saveReportStatusButton.disabled = false;
    }
});

["uidSearch", "nicknameSearch", "reasonSearch", "statusFilter", "suspensionFilter"]
    .forEach((id) => {
        document.getElementById(id).addEventListener("input", renderReports);
        document.getElementById(id).addEventListener("change", renderReports);
    });

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
        await loadAdminData();
    } catch (error) {
        setStatus(`読み込みに失敗しました: ${error.message}`);
    }
});

saveNgWordsButton.addEventListener("click", async () => {
    saveNgWordsButton.disabled = true;
    try {
        await requireAdmin();
        await setDoc(doc(db, "settings", "moderation"), {
            ngWords: ngWordsTextarea.value
                .split("\n")
                .map((word) => word.trim())
                .filter(Boolean)
        });
        setStatus("NGワードを保存しました");
    } catch (error) {
        setStatus(`保存に失敗しました: ${error.message}`);
    } finally {
        saveNgWordsButton.disabled = false;
    }
});
