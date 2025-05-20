import { request, RpcErrorCode } from "sats-connect";

// DOM Elements
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const walletInfo = document.getElementById('walletInfo');
const psbtForm = document.getElementById('psbtForm');
const signPsbtForm = document.getElementById('signPsbtForm');
const resultDiv = document.getElementById('result');
const errorDiv = document.getElementById('error');

// Current wallet state
let currentAddress = null;
let currentNetwork = null;

// Connect wallet
connectButton.addEventListener('click', async () => {
  try {
    const response = await request('wallet_connect', null);

    if (response.status === 'success') {
      const { addresses, network } = response.result;
      currentAddress = addresses[0].address;
      currentNetwork = network.bitcoin.name;

      // Update UI
      document.getElementById('walletAddress').textContent = currentAddress;
      document.getElementById('walletNetwork').textContent = currentNetwork;

      walletInfo.classList.remove('hidden');
      psbtForm.classList.remove('hidden');
      connectButton.classList.add('hidden');
      disconnectButton.classList.remove('hidden');

      // Pre-fill the signInputs with the connected address
      document.getElementById('signInputs').value = JSON.stringify({
        [currentAddress]: [0] // Default to signing input 0 with connected address
      }, null, 2);

    } else {
      showError(`Connection failed: ${response.error}`);
    }
  } catch (error) {
    showError(`Error connecting wallet: ${error.message}`);
  }
});

// Disconnect wallet
disconnectButton.addEventListener('click', async () => {
  try {
    await request('wallet_disconnect', null);
    resetUI();
  } catch (error) {
    showError(`Error disconnecting wallet: ${error.message}`);
  }
});

// Sign PSBT form submission
signPsbtForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    clearMessages();

    const psbtBase64 = document.getElementById('psbtBase64').value.trim();
    const signInputsText = document.getElementById('signInputs').value.trim();
    const broadcast = document.getElementById('broadcast').checked;

    // Validate inputs
    if (!psbtBase64) {
      throw new Error('PSBT is required');
    }

    let signInputs;
    try {
      signInputs = JSON.parse(signInputsText);
    } catch (e) {
      throw new Error('Invalid Sign Inputs format. Must be valid JSON');
    }

    // Request PSBT signing
    const response = await request('signPsbt', {
      psbt: psbtBase64,
      signInputs,
      broadcast
    });

    if (response.status === 'success') {
      showResult(`
                <h4>PSBT Successfully Signed</h4>
                ${broadcast ? `<p><strong>Transaction ID:</strong> ${response.result.txid}</p>` : ''}
                <p><strong>Signed PSBT:</strong></p>
                <textarea readonly style="width:100%; height:100px; margin-top:10px;">${response.result.psbt}</textarea>
            `);
    } else {
      if (response.error.code === RpcErrorCode.USER_REJECTION) {
        showError('User rejected the signing request');
      } else {
        showError(`Signing failed: ${response.error.message}`);
      }
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
});

// Helper functions
function showResult(message) {
  resultDiv.innerHTML = message;
  resultDiv.classList.remove('hidden');
  errorDiv.classList.add('hidden');
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  resultDiv.classList.add('hidden');
}

function clearMessages() {
  resultDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
}

function resetUI() {
  currentAddress = null;
  currentNetwork = null;

  walletInfo.classList.add('hidden');
  psbtForm.classList.add('hidden');
  connectButton.classList.remove('hidden');
  disconnectButton.classList.add('hidden');
  resultDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');

  // Clear form
  signPsbtForm.reset();
}
