import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { DaySlot } from '../data/todayMenu';
import {
  closedTodayNotes,
  dateIsBookable,
  sameCalendarDay,
  sameClockHour,
  scheduleDatePillLabel,
  scheduleTimeSlots,
  timeHeading,
  timeIsBookable,
  upcomingScheduleDates,
} from '../utils/scheduleSlots';
import { checkoutFlow } from '../styles/checkoutFlow';

export default function ScheduleSlotPicker({
  date,
  time,
  mealSlots = [],
  onChangeDate,
  onChangeTime,
}: {
  date: Date | null;
  time: Date | null;
  mealSlots?: DaySlot[];
  onChangeDate: (value: Date | null) => void;
  onChangeTime: (value: Date | null) => void;
}) {
  const now = new Date();
  const dates = upcomingScheduleDates();
  const slots = scheduleTimeSlots(mealSlots);
  const notes = closedTodayNotes(mealSlots, now);

  useEffect(() => {
    if (date && !dateIsBookable(date, mealSlots, new Date())) onChangeDate(null);
  }, [date, mealSlots, onChangeDate]);

  useEffect(() => {
    if (!time) return;
    if (!date || !timeIsBookable(date, time, mealSlots, new Date())) onChangeTime(null);
  }, [date, time, mealSlots, onChangeTime]);

  return (
    <View style={checkoutFlow.scheduleSection}>
      {notes.map((note) => (
        <Text key={note} style={checkoutFlow.scheduleNote}>{note}</Text>
      ))}

      <Text style={checkoutFlow.sectionLabel}>Date</Text>
      <View style={checkoutFlow.pillRow}>
        {dates.map((option) => {
          const bookable = dateIsBookable(option, mealSlots, now);
          const active = bookable && sameCalendarDay(date, option);
          return (
            <Pressable
              key={option.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !bookable }}
              disabled={!bookable}
              onPress={() => {
                if (!bookable) return;
                onChangeDate(option);
                if (time && !timeIsBookable(option, time, mealSlots, new Date())) onChangeTime(null);
              }}
              style={[
                checkoutFlow.pill,
                active && checkoutFlow.pillOn,
                !bookable && checkoutFlow.pillDisabled,
              ]}
            >
              <Text style={[
                checkoutFlow.pillText,
                active && checkoutFlow.pillTextOn,
                !bookable && checkoutFlow.pillTextDisabled,
              ]}
              >
                {scheduleDatePillLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[checkoutFlow.sectionLabel, checkoutFlow.sectionLabelSpaced]}>
        {timeHeading(mealSlots)}
      </Text>
      <View style={checkoutFlow.pillGrid}>
        {slots.map((slot) => {
          const bookable = Boolean(date) && timeIsBookable(date as Date, slot.time, mealSlots, now);
          const active = bookable && sameClockHour(time, slot.time);
          return (
            <Pressable
              key={slot.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !bookable }}
              disabled={!bookable}
              onPress={() => {
                if (!bookable) return;
                onChangeTime(slot.time);
              }}
              style={[
                checkoutFlow.pill,
                checkoutFlow.pillGridItem,
                active && checkoutFlow.pillOn,
                !bookable && checkoutFlow.pillDisabled,
              ]}
            >
              <Text style={[
                checkoutFlow.pillText,
                active && checkoutFlow.pillTextOn,
                !bookable && checkoutFlow.pillTextDisabled,
              ]}
              >
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
