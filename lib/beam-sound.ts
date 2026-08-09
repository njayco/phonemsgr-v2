import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Official Beam incoming-message sound effect.
const BEAM_SOUND_ASSET = require('@/assets/sounds/beam-message.wav');

let beamSound: Audio.Sound | null = null;

/**
 * Play the Beam incoming-message sound.
 *
 * - On native: respects the device ringer/silent switch (playsInSilentModeIOS: false)
 *   and device volume, matching standard messaging-app behaviour.
 * - On web: uses expo-av's Web Audio path; may be silently skipped if the browser
 *   has not yet received a user gesture on this page.
 * - Errors are swallowed so a sound failure never disrupts the app.
 */
export async function playBeamSound(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      // Respect silent/ringer switch — do NOT force through like DTT does.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });
    }

    if (!beamSound) {
      const { sound } = await Audio.Sound.createAsync(
        BEAM_SOUND_ASSET,
        { volume: 1.0 },
      );
      beamSound = sound;
    }

    await beamSound.replayAsync();
  } catch {
    // Never let a sound error surface to the user.
  }
}

/**
 * Release the loaded Sound object. Call this when the user logs out
 * or the app unmounts so native audio resources are freed.
 */
export async function unloadBeamSound(): Promise<void> {
  try {
    await beamSound?.unloadAsync();
  } catch {}
  beamSound = null;
}
