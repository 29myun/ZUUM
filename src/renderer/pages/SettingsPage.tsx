import { useState } from "react";
import { deleteAccount, type AppUser } from "../services/auth";
import { deleteAllChats } from "../services/chatService";

interface SettingsPageProps {
  user: AppUser;
  dark: boolean;
  onToggleTheme: () => void;
  onBack: () => void;
  onSignOut: () => Promise<void>;
  onAccountDeleted: () => void;
  onChatsCleared: () => void;
}

export default function SettingsPage({
  user,
  dark,
  onToggleTheme,
  onBack,
  onSignOut,
  onAccountDeleted,
  onChatsCleared,
}: SettingsPageProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError("Please enter your password to confirm deletion.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteAllChats(user.uid);
      await deleteAccount(user.uid, password);
      onAccountDeleted();
    } catch (err: any) {
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setError("Incorrect password. Please try again.");
      } else {
        setError(err?.message ?? "Failed to delete account.");
      }
      setDeleting(false);
    }
  };

  return (
    <div className={`settings-page ${dark ? "dark" : ""}`}>
      <div className="settings-card">
        <button className="ghost small settings-back" onClick={onBack}>
          ← Back
        </button>

        <h2>Settings</h2>

        <div className="settings-section">
          <h3>Account</h3>
          <div className="settings-row">
            <span className="settings-label">Name</span>
            <span className="settings-value">{user.displayName ?? "—"}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user.email ?? "—"}</span>
          </div>
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-row">
            <span className="settings-label">Theme</span>
            <button className="ghost small" onClick={onToggleTheme}>
              {dark ? "☀️ Light mode" : "🌙 Dark mode"}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Session</h3>
          <button className="ghost" onClick={onSignOut}>
            Log Out
          </button>
        </div>

        <div className="settings-section">
          <h3>Data</h3>
          <p className="settings-warning">
            This will permanently delete all your chat history. This cannot be undone.
          </p>
          {!confirmingClear ? (
            <button
              className="danger"
              onClick={() => setConfirmingClear(true)}
            >
              Clear All Chatlogs
            </button>
          ) : (
            <div className="settings-confirm">
              <span>Are you sure?</span>
              <button
                className="danger"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await deleteAllChats(user.uid);
                    onChatsCleared();
                  } catch (err: any) {
                    setError(err?.message ?? "Failed to clear chats.");
                  }
                  setClearing(false);
                  setConfirmingClear(false);
                }}
              >
                {clearing ? "Clearing..." : "Yes, clear all chats"}
              </button>
              <button
                className="ghost small"
                disabled={clearing}
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="settings-section settings-danger-zone">
          <h3>Danger Zone</h3>
          <p className="settings-warning">
            This will permanently delete your account and all your chat history. This action cannot be undone.
          </p>
          {error && <p className="settings-error">{error}</p>}
          {!confirming ? (
            <button
              className="danger"
              onClick={() => setConfirming(true)}
            >
              Delete Account
            </button>
          ) : (
            <div className="settings-confirm">
              <span>Enter your password to confirm:</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={deleting}
                autoFocus
              />
              <button
                className="danger"
                disabled={deleting || !password}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
              <button
                className="ghost small"
                disabled={deleting}
                onClick={() => { setConfirming(false); setPassword(""); setError(null); }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
