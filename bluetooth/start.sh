#!/bin/bash
set -e

# Set device name
DEVICE_NAME=${BLUETOOTH_DEVICE_NAME:-$(printf "balenaSound %s"$(hostname | cut -c -4))}
btmgmt name "$DEVICE_NAME"

# Set bluetooth pairing mode:
# - SSP (default): Secure Simple Pairing, no PIN code required
# - LEGACY: disable SSP mode, PIN code required
PAIRING_MODE=${BLUETOOTH_PAIRING_MODE:-"SSP"}
PIN_CODE=${BLUETOOTH_PIN_CODE:-"0000"}
AGENT_CAPABILITY="NoInputNoOutput"

if [[ $PAIRING_MODE == "LEGACY" ]]; then
  echo "Starting bluetooth agent in Legacy Pairing Mode (LPM)"
  btmgmt ssp off > /dev/null
  AGENT_CAPABILITY="KeyboardDisplay"
else 
  echo "Starting bluetooth agent in Secure Simple Pairing Mode (SSPM)"
fi

# Start bluetooth agent
exec python /usr/src/bluetooth-agent --capability $AGENT_CAPABILITY --pincode $PIN_CODE

