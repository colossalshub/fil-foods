import { View, Text, Pressable } from 'react-native';
import {
  kitchenTimeSlots,
  sameCalendarDay,
  sameClockHour,
  scheduleDatePillLabel,
  upcomingScheduleDates,
} from '../utils/scheduleSlots';
import { checkoutFlow } from '../styles/checkoutFlow';

export default function ScheduleSlotPicker({
  date,
  time,
  onChangeDate,
  onChangeTime,
}: {
  date: Date | null;
  time: Date | null;
  onChangeDate: (value: Date | null) => void;
  onChangeTime: (value: Date | null) => void;
}) {
  const dates = upcomingScheduleDates();
  const slots = kitchenTimeSlots();

  return (
    <View style={checkoutFlow.scheduleSection}>
      <Text style={checkoutFlow.sectionLabel}>Date</Text>
      <View style={checkoutFlow.pillRow}>
        {dates.map((option) => {
          const active = sameCalendarDay(date, option);
          return (
            <Pressable
              key={option.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChangeDate(option)}
              style={[checkoutFlow.pill, active && checkoutFlow.pillOn]}
            >
              <Text style={[checkoutFlow.pillText, active && checkoutFlow.pillTextOn]}>
                {scheduleDatePillLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[checkoutFlow.sectionLabel, checkoutFlow.sectionLabelSpaced]}>
        Time (Monday to Saturday, 7:00 AM to 6:00 PM)
      </Text>
      <View style={checkoutFlow.pillGrid}>
        {slots.map((slot) => {
          const active = sameClockHour(time, slot.time);
          return (
            <Pressable
              key={slot.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChangeTime(slot.time)}
              style={[
                checkoutFlow.pill,
                checkoutFlow.pillGridItem,
                active && checkoutFlow.pillOn,
              ]}
            >
              <Text style={[checkoutFlow.pillText, active && checkoutFlow.pillTextOn]}>
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}