import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../lib/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (phone.length < 9) return;
    setLoading(true);
    try {
      const full = `+971${phone.replace(/^0/, '')}`;
      await authApi.sendOtp(full);
      setStep('otp');
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const full = `+971${phone.replace(/^0/, '')}`;
      const res: any = await authApi.verifyOtp(full, otp);
      const data = res?.data ?? res;
      if (data?.accessToken) {
        await AsyncStorage.multiSet([
          ['manara_access_token', data.accessToken],
          ['manara_refresh_token', data.refreshToken ?? ''],
          ['manara_workspace_id', data.workspaceId ?? ''],
        ]);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>Manara</Text>
          <Text style={styles.logoSub}>Tenant Portal</Text>
        </View>

        {step === 'phone' ? (
          <View>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Enter your registered mobile number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>🇦🇪 +971</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="50 123 4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.btn, phone.length < 9 && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={phone.length < 9 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.heading}>Verify OTP</Text>
            <Text style={styles.subheading}>Enter the 6-digit code sent to +971 {phone}</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="• • • • • •"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, otp.length !== 6 && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.back}>
              <Text style={styles.backText}>← Change number</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.hint}>Dev: any number · OTP 123456</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoDot: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#4F46E5', marginBottom: 12 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  logoSub: { fontSize: 14, color: '#a5b4fc', marginTop: 2 },
  heading: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#a5b4fc', marginBottom: 24 },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  prefix: { backgroundColor: '#312e81', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  prefixText: { color: '#e0e7ff', fontSize: 14 },
  phoneInput: {
    flex: 1, backgroundColor: '#312e81', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: '#ffffff',
  },
  otpInput: {
    backgroundColor: '#312e81', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 18, fontSize: 28, color: '#ffffff', letterSpacing: 12,
    textAlign: 'center', marginBottom: 16,
  },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  back: { alignItems: 'center', marginTop: 16 },
  backText: { color: '#a5b4fc', fontSize: 14 },
  hint: { textAlign: 'center', color: '#4c1d95', fontSize: 11, marginTop: 40 },
});
