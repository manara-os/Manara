'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    try {
      await authApi.sendOtp(phone.trim());
      setStep('otp');
      toast.success('OTP sent to your phone');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) return;

    setLoading(true);
    try {
      const response = await authApi.verifyOtp(phone, otp.trim()) as any;
      setAuth({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        workspaces: response.workspaces || [],
      });
      toast.success(`Welcome, ${response.user?.fullName ?? 'back'}!`);
      router.replace('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-amber-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600 shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Manara OS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">UAE Property Management Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8"
        >
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sign in</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your mobile number to receive a one-time passcode</p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm">
                        +971
                      </span>
                      <input
                        type="tel"
                        value={phone.startsWith('+971') ? phone.slice(4) : phone}
                        onChange={e => setPhone('+971' + e.target.value.replace(/\D/g, ''))}
                        placeholder="50 123 4567"
                        className="flex-1 min-w-0 block px-3 py-2.5 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm outline-none"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Dev bypass: use any number, OTP is 123456</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length < 10}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Enter OTP</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  We sent a 6-digit code to <span className="font-medium text-gray-700 dark:text-gray-300">{phone}</span>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      One-Time Passcode
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest placeholder-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium"
                  >
                    Resend OTP
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          © {new Date().getFullYear()} Manara OS · All rights reserved
        </p>
      </div>
    </div>
  );
}
