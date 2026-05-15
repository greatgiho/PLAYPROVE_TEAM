"use client";

import { ProfileAvatarEditor } from "./ProfileAvatarEditor";
import type { ProfileAvatarPayload } from "./profileAvatarTypes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initial: ProfileAvatarPayload;
  onUpdated?: (next: ProfileAvatarPayload) => void;
};

export function ProfileAvatarModal({ isOpen, onClose, userId, initial, onUpdated }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop show modal-backdrop--sheet"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profileAvatarModalTitle"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" id="profileAvatarModalTitle">
            프로필 사진
          </div>
          <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">
          <ProfileAvatarEditor userId={userId} initial={initial} onUpdated={onUpdated} variant="plain" />
        </div>
      </div>
    </div>
  );
}
