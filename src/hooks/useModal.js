import { useCallback, useState } from "react";

const DEFAULT_MODAL_STATE = {
  isOpen: false,
  title: "",
  message: "",
  type: "info",
  onConfirm: null,
  onCancel: null,
  confirmText: "OK",
  cancelText: "Cancel",
  showCancel: false,
  inputValue: "",
  setInputValue: () => {},
  placeholder: "Enter team name...",
  labelText: "Team Name:",
};

export default function useModal() {
  const [modal, setModal] = useState(DEFAULT_MODAL_STATE);

  const showModal = useCallback((config) => {
    setModal({
      ...DEFAULT_MODAL_STATE,
      isOpen: true,
      ...config,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback(
    (message, title = "Notification") => {
      showModal({ title, message, type: "info" });
    },
    [showModal]
  );

  const showSuccess = useCallback(
    (message, title = "Success") => {
      showModal({ title, message, type: "success" });
    },
    [showModal]
  );

  const showError = useCallback(
    (message, title = "Error") => {
      showModal({ title, message, type: "error" });
    },
    [showModal]
  );

  const showWarning = useCallback(
    (message, title = "Warning") => {
      showModal({ title, message, type: "warning" });
    },
    [showModal]
  );

  const showConfirm = useCallback(
    (
      message,
      title = "Confirm",
      onConfirm,
      confirmText = "Yes",
      cancelText = "No"
    ) => {
      showModal({
        title,
        message,
        type: "warning",
        onConfirm,
        confirmText,
        cancelText,
        showCancel: true,
      });
    },
    [showModal]
  );

  const showChoice = useCallback(
    (message, title = "Track Stats?", confirmText = "Yes", cancelText = "No") =>
      new Promise((resolve) => {
        const handleConfirm = () => {
          hideModal();
          resolve(true);
        };
        const handleCancel = () => {
          hideModal();
          resolve(false);
        };
        showModal({
          title,
          message,
          type: "info",
          showCancel: true,
          confirmText,
          cancelText,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        });
      }),
    [hideModal, showModal]
  );

  const showInput = useCallback(
    (
      title = "Enter Team Name",
      placeholder = "Enter team name...",
      labelText = "Team Name:"
    ) =>
      new Promise((resolve, reject) => {
        let resolved = false;
        let inputValue = "";

        const setInputValue = (value) => {
          inputValue = value;
          setModal((prev) => ({ ...prev, inputValue: value }));
        };

        const handleConfirm = () => {
          if (resolved) return;
          resolved = true;
          hideModal();
          resolve(inputValue || "");
        };

        const handleCancel = () => {
          if (resolved) return;
          resolved = true;
          hideModal();
          reject(new Error("Cancelled"));
        };

        showModal({
          title,
          type: "input",
          showCancel: true,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
          confirmText: "Confirm",
          cancelText: "Cancel",
          inputValue: "",
          setInputValue,
          placeholder,
          labelText,
        });
      }),
    [hideModal, showModal]
  );

  return {
    modal,
    showModal,
    hideModal,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showChoice,
    showInput,
  };
}

