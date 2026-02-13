import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const LoginScreen = () => {
    const { login, resetPassword, verifyOtpAndReset } = useApp();
    const [mode, setMode] = useState<'login' | 'reset' | 'verifyOtp'>('login');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI States
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestReset = async () => {
        setError('');
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsSubmitting(true);

        try {
            await resetPassword(email);
            setSuccess('OTP generated! Check your email/logs.');
            setTimeout(() => {
                setMode('verifyOtp');
                setSuccess('');
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to generate OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        if (!otp || !password) {
            setError('Please enter the OTP and your new password');
            return;
        }

        setIsSubmitting(true);

        try {
            // "password" state here acts as the NEW password
            await verifyOtpAndReset(email, otp, password);
            setSuccess('Password updated! Logging you in...');

            // Auto login or switch to login
            setTimeout(async () => {
                try {
                    await login(email, password);
                } catch {
                    setMode('login');
                }
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Invalid OTP or expired.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'login') handleLogin();
        else if (mode === 'reset') handleRequestReset();
        else if (mode === 'verifyOtp') handleVerifyOtp();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
                        CG
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Clonmel Glass</h1>
                    <p className="text-slate-500">
                        {mode === 'login' && 'Sign in to Invoice Hub'}
                        {mode === 'reset' && 'Reset Password (OTP)'}
                        {mode === 'verifyOtp' && 'Enter OTP & New Password'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {mode === 'verifyOtp' ? 'Confirm Email' : 'Email Address'}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={mode === 'verifyOtp'}
                            onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                            className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 outline-none transition-all"
                            placeholder="your@email.com"
                        />
                    </div>

                    {mode === 'verifyOtp' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">OTP Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all tracking-widest text-center font-bold"
                                placeholder="123456"
                            />
                        </div>
                    )}

                    {(mode === 'login' || mode === 'verifyOtp') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {mode === 'verifyOtp' ? 'Set New Password' : 'Password'}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder={mode === 'verifyOtp' ? "New password" : "Enter password"}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
                            {success}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Processing...' :
                            mode === 'login' ? 'Sign In' :
                                mode === 'reset' ? 'Send OTP' : 'Verify & Reset'}
                    </button>

                    <div className="text-center pt-4 border-t border-slate-200 space-y-2">
                        {mode === 'login' && (
                            <button onClick={() => setMode('reset')} className="block w-full text-sm text-slate-500 hover:text-brand-600 transition-colors">
                                Forgot Password?
                            </button>
                        )}

                        {(mode === 'reset' || mode === 'verifyOtp') && (
                            <button onClick={() => setMode('login')} className="text-brand-600 font-semibold text-sm">
                                Back to Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
