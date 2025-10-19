import { View, TextInput, Text, TouchableOpacity, Keyboard, Alert } from "react-native";
import React, { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";
import { MaterialIcons } from '@expo/vector-icons';
import Navbar from "@/components/Navbar";


const PasswordReset = () => {
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(params.email || "");
    const [code, setCode] = useState("");
    const [newPassword1, setNewPassword1] = useState("");
    const [newPassword2, setNewPassword2] = useState("");
    const [errors, setErrors] = useState({
        email: "",
        code: "",
        newPassword1: "",
        newPassword2: "",
        general: ""
    });
    const [showPassword1, setShowPassword1] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const auth = useAuth();
    const router = useRouter();
    const { colors, baseStyle } = useTheme();

    const handleResetPassword = async () => {
        // Dismiss keyboard
        Keyboard.dismiss();
        
        // Clear previous errors
        setErrors({
            email: "",
            code: "",
            newPassword1: "",
            newPassword2: "",
            general: ""
        });
        
        // Basic validation
        let hasError = false;
        
        if (!email.trim() || !email.includes('@')) {
            setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
            hasError = true;
        }
        
        if (!code.trim()) {
            setErrors(prev => ({ ...prev, code: "Verification code is required" }));
            hasError = true;
        }
        
        if (!newPassword1) {
            setErrors(prev => ({ ...prev, newPassword1: "New password is required" }));
            hasError = true;
        } else if (newPassword1.length < 8) {
            setErrors(prev => ({ ...prev, newPassword1: "Password must be at least 8 characters" }));
            hasError = true;
        }
        
        if (!newPassword2) {
            setErrors(prev => ({ ...prev, newPassword2: "Please confirm your password" }));
            hasError = true;
        } else if (newPassword1 !== newPassword2) {
            setErrors(prev => ({ ...prev, newPassword2: "Passwords don't match" }));
            hasError = true;
        }
        
        if (hasError) return;
        
        setIsSubmitting(true);
        try {
            const result = await auth.confirmPasswordReset(
                email, 
                code, 
                newPassword1, 
                newPassword2
            );
            
            // If we got here, password reset was successful
            // If the server returned a token, we've already stored it in the AuthContext
            // We can redirect directly to the index page
            
            if (result.key || result.token) {
                // Token was saved, redirect to index page
                Alert.alert(
                    "Password Reset Successful",
                    "Your password has been reset successfully. You will now be redirected to the application.",
                    [{ 
                        text: "OK", 
                        onPress: () => router.replace("/") 
                    }]
                );
            } else {
                // No token returned, redirect to login
                Alert.alert(
                    "Password Reset Successful",
                    "Your password has been reset successfully. You can now log in with your new password.",
                    [{ 
                        text: "Go to Login", 
                        onPress: () => router.replace("/login") 
                    }]
                );
            }
        } catch (error: any) {
            console.error("Password reset error:", error);
            setErrors(prev => ({
                ...prev,
                general: error.message || "Failed to reset password. Please check your details and try again."
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "center",
            backgroundColor: colors.bgColor,
        }}>
            <Navbar title="Preg Check" subTitle="Reset Password" />

            <Text style={[baseStyle.heading_3, { marginBottom: 10, marginTop: 30 }]}>
                Reset Your Password
            </Text>
            
            <Text style={{ textAlign: "center", marginBottom: 20, paddingHorizontal: 20 }}>
                Enter the verification code from the email we sent you and choose a new password.
            </Text>

            {/* Email Input */}
            <View style={{ width: '80%', marginBottom: 15 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        errors.email ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                    }}
                    value={email}
                    placeholder="Email address"
                    placeholderTextColor={colors.fgColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="email-input"
                />
                {errors.email ? (
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5 }}>
                        {errors.email}
                    </Text>
                ) : null}
            </View>

            {/* Code Input */}
            <View style={{ width: '80%', marginBottom: 15 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        errors.code ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setCode(text);
                        if (errors.code) setErrors(prev => ({ ...prev, code: "" }));
                    }}
                    value={code}
                    placeholder="Verification code"
                    placeholderTextColor={colors.fgColor}
                    testID="code-input"
                />
                {errors.code ? (
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5 }}>
                        {errors.code}
                    </Text>
                ) : null}
            </View>

            {/* Password 1 input */}
            <View style={{ width: '80%', alignItems: 'center', position: 'relative', marginBottom: 15 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        errors.newPassword1 ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setNewPassword1(text);
                        if (errors.newPassword1) setErrors(prev => ({ ...prev, newPassword1: "" }));
                    }}
                    value={newPassword1}
                    placeholder="New Password"
                    placeholderTextColor={colors.fgColor}
                    secureTextEntry={!showPassword1}
                    testID="new-password1-input"
                />
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        right: 20,
                        top: '50%',
                        transform: [{ translateY: -16 }],
                        padding: 5
                    }}
                    onPress={() => setShowPassword1(!showPassword1)}
                >
                    <MaterialIcons
                        name={showPassword1 ? "visibility-off" : "visibility"}
                        size={24}
                        color={colors.fgColor}
                    />
                </TouchableOpacity>
                {errors.newPassword1 ? (
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5, alignSelf: 'flex-start' }}>
                        {errors.newPassword1}
                    </Text>
                ) : null}
            </View>

            {/* Password 2 input */}
            <View style={{ width: '80%', alignItems: 'center', position: 'relative', marginBottom: 20 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        errors.newPassword2 ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setNewPassword2(text);
                        if (errors.newPassword2) setErrors(prev => ({ ...prev, newPassword2: "" }));
                    }}
                    value={newPassword2}
                    placeholder="Confirm New Password"
                    placeholderTextColor={colors.fgColor}
                    secureTextEntry={!showPassword2}
                    testID="new-password2-input"
                />
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        right: 20,
                        top: '50%',
                        transform: [{ translateY: -16 }],
                        padding: 5
                    }}
                    onPress={() => setShowPassword2(!showPassword2)}
                >
                    <MaterialIcons
                        name={showPassword2 ? "visibility-off" : "visibility"}
                        size={24}
                        color={colors.fgColor}
                    />
                </TouchableOpacity>
                {errors.newPassword2 ? (
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5, alignSelf: 'flex-start' }}>
                        {errors.newPassword2}
                    </Text>
                ) : null}
            </View>
            
            <Button
                onPress={handleResetPassword}
                title={isSubmitting ? "Resetting..." : "Reset Password"}
                style={{ marginBottom: 20 }}
                outline={false}
                disabled={isSubmitting}
                testID="reset-password-button"
            />

            {errors.general ? (
                <Text style={{ color: colors.error, textAlign: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
                    {errors.general}
                </Text>
            ) : null}

            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity 
                    onPress={() => router.replace("/login")}
                    style={{ marginRight: 20 }}
                >
                    <Text style={{ color: colors.fgColor, fontWeight: 'bold' }}>
                        Back to Login
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => router.push("/register")}>
                    <Text style={{ color: colors.fgColor, fontWeight: 'bold' }}>
                        Create Account
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PasswordReset;
