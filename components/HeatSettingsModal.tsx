import Button from "@/components/Button";
import { useNotificationSettings } from "@/contexts/NotificationSettingsContext";
import { useTheme } from "@/hooks/useTheme";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Switch, Text, TouchableOpacity, View } from "react-native";

export interface HeatSettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

const HeatSettingsModal = ({ visible, onClose }: HeatSettingsModalProps) => {
    const { colors, baseStyle } = useTheme();
    const [showTimePicker, setShowTimePicker] = useState(false);

    const {
        settings,
        setHeatNotificationsEnabled,
        setNotificationTime,
        setHeatNotificationCount,
        setHeatNotificationInterval,
    } = useNotificationSettings();

    const notificationCountOptions = [1, 2, 3, 4, 5];

    const handleNotificationToggle = async (enabled: boolean) => {
        await setHeatNotificationsEnabled(enabled);
    };

    const handleTimeChange = async (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        if (selectedDate) {
            const hour = selectedDate.getHours();
            const minute = selectedDate.getMinutes();
            await setNotificationTime({ hour, minute });
        }
    };

    const formatTime = (hour: number, minute: number): string => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const displayMinute = minute.toString().padStart(2, '0');
        return `${displayHour}:${displayMinute} ${period}`;
    };

    const handleCountChange = async (count: number) => {
        await setHeatNotificationCount(count);
    };

    const handleIntervalChange = async (days: number) => {
        if (days >= 1 && days <= 60) {
            await setHeatNotificationInterval(days);
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={baseStyle.modal_overlay}>
                <View style={[baseStyle.modal_content, { width: '90%', maxWidth: 400 }]}>
                    <Text style={[baseStyle.heading_3, { marginBottom: 16 }]}>
                        Heat Notification Settings
                    </Text>

                    {/* Heat Notifications Toggle */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 8,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 16,
                                color: colors.fgColor,
                            }}>
                                Heat Notifications
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                color: colors.thrdColor,
                                marginTop: 4,
                            }}>
                                Get notified when animals are expected to be in heat
                            </Text>
                        </View>
                        <Switch
                            value={settings.heatNotificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: colors.thrdColor, true: colors.brgtColor }}
                            thumbColor={settings.heatNotificationsEnabled ? colors.bgColor : colors.thrdColor}
                            testID="modal-heat-notifications-toggle"
                        />
                    </View>

                    {settings.heatNotificationsEnabled && (
                        <View style={{
                            marginTop: 16,
                            paddingTop: 16,
                            borderTopWidth: 1,
                            borderTopColor: colors.thrdColor,
                        }}>
                            {/* Notification Time Picker */}
                            <Text style={{
                                fontSize: 16,
                                color: colors.fgColor,
                                marginBottom: 8,
                            }}>
                                Notification Time
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowTimePicker(true)}
                                style={{
                                    backgroundColor: colors.bgColor,
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: colors.thrdColor,
                                }}
                                testID="modal-notification-time-button"
                            >
                                <Text style={{
                                    fontSize: 16,
                                    color: colors.brgtColor,
                                    textAlign: 'center',
                                }}>
                                    {formatTime(settings.notificationTime.hour, settings.notificationTime.minute)}
                                </Text>
                            </TouchableOpacity>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={new Date(2000, 0, 1, settings.notificationTime.hour, settings.notificationTime.minute)}
                                    mode="time"
                                    is24Hour={false}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleTimeChange}
                                    testID="modal-notification-time-picker"
                                />
                            )}

                            {Platform.OS === 'ios' && showTimePicker && (
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker(false)}
                                    style={{
                                        marginTop: 8,
                                        padding: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: colors.brgtColor, fontSize: 16 }}>Done</Text>
                                </TouchableOpacity>
                            )}

                            {/* Reminders Per Animal */}
                            <View style={{ marginTop: 16 }}>
                                <Text style={{
                                    fontSize: 16,
                                    color: colors.fgColor,
                                    marginBottom: 8,
                                }}>
                                    Reminders Per Animal
                                </Text>
                                <Text style={{
                                    fontSize: 12,
                                    color: colors.thrdColor,
                                    marginBottom: 8,
                                }}>
                                    How many times to notify for each heat record
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                }}>
                                    {notificationCountOptions.map((count) => (
                                        <TouchableOpacity
                                            key={count}
                                            onPress={() => handleCountChange(count)}
                                            style={{
                                                flex: 1,
                                                marginHorizontal: 4,
                                                padding: 12,
                                                borderRadius: 8,
                                                backgroundColor: settings.heatNotificationCount === count
                                                    ? colors.brgtColor
                                                    : colors.bgColor,
                                                borderWidth: 1,
                                                borderColor: settings.heatNotificationCount === count
                                                    ? colors.brgtColor
                                                    : colors.thrdColor,
                                                alignItems: 'center',
                                            }}
                                            testID={`modal-notification-count-${count}`}
                                        >
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: settings.heatNotificationCount === count
                                                    ? colors.bgColor
                                                    : colors.fgColor,
                                            }}>
                                                {count}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Cycle Days Stepper (always visible) */}
                    <View style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTopWidth: 1,
                        borderTopColor: colors.thrdColor,
                    }}>
                        <Text style={{
                            fontSize: 16,
                            color: colors.fgColor,
                            marginBottom: 8,
                        }}>
                            Cycle Days
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            color: colors.thrdColor,
                            marginBottom: 8,
                        }}>
                            Length of the estrus cycle in days
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <TouchableOpacity
                                onPress={() => handleIntervalChange(settings.heatNotificationInterval - 1)}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: colors.bgColor,
                                    borderWidth: 1,
                                    borderColor: colors.thrdColor,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                disabled={settings.heatNotificationInterval <= 1}
                                testID="modal-interval-decrease"
                            >
                                <Text style={{
                                    fontSize: 24,
                                    color: settings.heatNotificationInterval <= 1 ? colors.thrdColor : colors.fgColor,
                                }}>
                                    -
                                </Text>
                            </TouchableOpacity>
                            <View style={{
                                paddingHorizontal: 24,
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontSize: 24,
                                    fontWeight: '600',
                                    color: colors.brgtColor,
                                }}>
                                    {settings.heatNotificationInterval}
                                </Text>
                                <Text style={{
                                    fontSize: 12,
                                    color: colors.thrdColor,
                                }}>
                                    days
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleIntervalChange(settings.heatNotificationInterval + 1)}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: colors.bgColor,
                                    borderWidth: 1,
                                    borderColor: colors.thrdColor,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                disabled={settings.heatNotificationInterval >= 60}
                                testID="modal-interval-increase"
                            >
                                <Text style={{
                                    fontSize: 24,
                                    color: settings.heatNotificationInterval >= 60 ? colors.thrdColor : colors.fgColor,
                                }}>
                                    +
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Done button */}
                    <Button
                        onPress={onClose}
                        title="Done"
                        style={{ marginTop: 20, alignSelf: 'center' }}
                        testID="heat-settings-modal-done"
                    />
                </View>
            </View>
        </Modal>
    );
};

export default HeatSettingsModal;
