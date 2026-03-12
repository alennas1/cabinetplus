import React, { useMemo, useRef, useState, useEffect } from "react";
import { X, Plus, Trash2, Check, ArrowUpRight, ChevronLeft, ChevronRight } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../services/appointmentService";
import { createPatient, getPatients } from "../services/patientService";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { getApiErrorMessage } from "../utils/error";
import {
  TIME_FORMATS,
  buildDateAtMinutes,
  formatHour,
  getTimeFormatPreference,
  getWorkingHoursWindow,
} from "../utils/workingHours";
import { formatDayMonthByPreference } from "../utils/dateFormat";
import "./Appointments.css";

const QUARTER_MINUTES = ["00", "15", "30", "45"];

export default function Appointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [timeFormat, setTimeFormat] = useState(() => getTimeFormatPreference());
  const use12HourFormat = timeFormat === TIME_FORMATS.TWELVE_HOURS;
  const [showModal, setShowModal] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completeAppt, setCompleteAppt] = useState(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const [cancelAppt, setCancelAppt] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [selectedDate, setSelectedDate] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [openedFromSlot, setOpenedFromSlot] = useState(false);
  const [formBaseDate, setFormBaseDate] = useState(null);

  const [viewMode, setViewMode] = useState("day"); // day | 4-days
  const [weekOffset, setWeekOffset] = useState(0);

  const [slotDuration, setSlotDuration] = useState(30); // Default slot duration: 30 min
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);
  const [isCancellingAppointment, setIsCancellingAppointment] = useState(false);
  const [workingHours, setWorkingHours] = useState(() => getWorkingHoursWindow());
  const [minuteDropdownOpen, setMinuteDropdownOpen] = useState(false);
  const minuteDropdownRef = useRef(null);

  const durationOptions = useMemo(() => [15, 30, 45, 60], []);

  const toFormTimeParts = useMemo(() => {
    return (date) => {
      const hours = date.getHours();
      const minute = String(date.getMinutes()).padStart(2, "0");

      if (!use12HourFormat) {
        return {
          hour: String(hours).padStart(2, "0"),
          minute,
          period: "",
        };
      }

      const period = hours >= 12 ? "PM" : "AM";
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      return {
        hour: String(hour12),
        minute,
        period,
      };
    };
  }, [use12HourFormat]);

  const [formData, setFormData] = useState({
    id: null,
    patientId: null,
    patientName: "",
    hour: "",
    minute: "",
    status: "SCHEDULED",
    duration: 30,
      period: "AM",
 // <-- added duration field,
  });

  const [newPatient, setNewPatient] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    age: "",
    sex: "Homme",
  });

  const statusLabels = {
    SCHEDULED: "Planifié",
    COMPLETED: "Complet",
    CANCELLED: "Annulé",
  };

  const handleSexChange = (e) => {
    setNewPatient({ ...newPatient, sex: e.target.value });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, appointmentsData] = await Promise.all([
          getPatients(),
          getAppointments(),
        ]);
        setPatients(patientsData);
        setAppointments(appointmentsData);
      } catch (err) {
        console.error("Error fetching appointments page data:", err);
        toast.error("Erreur lors du chargement des rendez-vous");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const syncWorkingHours = () => setWorkingHours(getWorkingHoursWindow());
    window.addEventListener("workingHoursChanged", syncWorkingHours);
    return () => window.removeEventListener("workingHoursChanged", syncWorkingHours);
  }, []);

  useEffect(() => {
    const syncTimeFormat = () => setTimeFormat(getTimeFormatPreference());
    window.addEventListener("timeFormatChanged", syncTimeFormat);
    return () => window.removeEventListener("timeFormatChanged", syncTimeFormat);
  }, []);

  const handlePatientSearch = (query) => {
    setPatientSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = patients.filter(
      (p) =>
        (p.firstname || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.lastname || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.phone && p.phone.includes(query))
    );
    setSearchResults(results.slice(0, 3));
  };

 const buildSlotsForDate = (baseDate) => {
  const slots = [];
  const dayStart = buildDateAtMinutes(baseDate, workingHours.startMinutes);
  const dayEnd = workingHours.endMinutes === 24 * 60 ? addDays(startOfDay(baseDate), 1) : buildDateAtMinutes(baseDate, workingHours.endMinutes);

  // Sort appointments by start time
  const dayAppointments = appointments
    .filter((a) => {
      const apptStart = new Date(a.dateTimeStart);
      return apptStart >= dayStart && apptStart < dayEnd;
    })
    .sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart));

  let currentTime = new Date(dayStart);

  while (currentTime < dayEnd) {
    // Find the next appointment starting after currentTime
    const nextAppt = dayAppointments.find((a) => new Date(a.dateTimeStart) >= currentTime);

    if (nextAppt && new Date(nextAppt.dateTimeStart) <= currentTime) {
      // We're at the start of an appointment
      const apptStart = new Date(nextAppt.dateTimeStart);
      const apptEnd = new Date(nextAppt.dateTimeEnd);

      slots.push({
        start: apptStart,
        end: apptEnd,
        appointments: [nextAppt],
      });

      currentTime = new Date(apptEnd);
    } else {
      // Empty slot
      let nextSlotEnd;
      if (nextAppt) {
        // Either fill to next appointment or by slotDuration
        nextSlotEnd = new Date(Math.min(currentTime.getTime() + slotDuration * 60000, new Date(nextAppt.dateTimeStart).getTime()));
      } else {
        nextSlotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        if (nextSlotEnd > dayEnd) nextSlotEnd = new Date(dayEnd);
      }

      slots.push({
        start: new Date(currentTime),
        end: new Date(nextSlotEnd),
        appointments: [], // empty
      });

      currentTime = new Date(nextSlotEnd);
    }
  }

  return slots;
 };

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const getWeekStartMonday = (date) => {
    const d = startOfDay(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = (day === 0 ? -6 : 1) - day; // move to Monday
    d.setDate(d.getDate() + diff);
    return d;
  };

  const toDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDayLabel = (date) => {
    const weekday = date.toLocaleDateString("fr-FR", { weekday: "short" });
    return `${weekday} ${formatDayMonthByPreference(date)}`;
  };

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const formatWeekRange = (start) => {
    const end = addDays(start, 3);
    return `Du ${formatDayMonthByPreference(start)} au ${formatDayMonthByPreference(end)}`;
  };

  const getSelectedDayBaseDate = () => {
    if (selectedDate === "today") return startOfDay(new Date());
    if (selectedDate === "tomorrow") return startOfDay(addDays(new Date(), 1));
    if (selectedDate === "custom" && customDate) {
      const [year, month, day] = customDate.split("-");
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return startOfDay(new Date());
  };



  const handleSlotClick = (slot) => {
    if (slot.appointments.length > 0) return;
    setFormBaseDate(startOfDay(slot.start));
    const parts = toFormTimeParts(slot.start);
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: parts.hour,
      minute: parts.minute,
      status: "SCHEDULED",
      duration: slotDuration,
      period: parts.period || "AM",
    });
    setIsEditing(false);
    setOpenedFromSlot(true);
    setShowModal(true);
  };

  const handleWeekSlotClick = (dayDate, slotStart) => {
    setFormBaseDate(startOfDay(dayDate));
    const parts = toFormTimeParts(slotStart);
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: parts.hour,
      minute: parts.minute,
      status: "SCHEDULED",
      duration: slotDuration,
      period: parts.period || "AM",
    });
    setIsEditing(false);
    setOpenedFromSlot(true);
    setShowModal(true);
  };

  const handleEditAppointment = (appt) => {
    if (!appt || showModal) return;

    const start = new Date(appt.dateTimeStart);
    const end = new Date(appt.dateTimeEnd);
    const patientName = getPatientName(appt);
    const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) || slotDuration;
    const parts = toFormTimeParts(start);

    setFormBaseDate(startOfDay(start));
    setFormData({
      id: appt.id,
      patientId: appt.patient?.id ?? appt.patientId ?? null,
      patientName,
      hour: parts.hour,
      minute: parts.minute,
      status: appt.status || "SCHEDULED",
      duration,
      period: parts.period || "AM",
    });
    setPatientSearch(patientName);
    setSearchResults([]);
    setIsNewPatient(false);
    setIsEditing(true);
    setOpenedFromSlot(false);
    setShowModal(true);
  };

  const handleMarkCompleted = (appt) => {
    setCompleteAppt(appt);
    setShowCompleteConfirm(true);
  };
  const handleMarkCancelled = (appt) => {
    setCancelAppt(appt);
    setShowCancelConfirm(true);
  };

  const confirmCompleteAppointment = async () => {
    if (!completeAppt || isCompletingAppointment) return;
    setIsCompletingAppointment(true);
    try {
      const payload = { ...completeAppt, status: "COMPLETED", patientId: completeAppt.patient?.id ?? completeAppt.patientId };
      const updated = await updateAppointment(completeAppt.id, payload);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success("Rendez-vous complété ");
    } catch (err) {
      console.error("Error marking complete:", err);
      toast.error("Erreur lors du changement d'état ");
    } finally {
      setIsCompletingAppointment(false);
      setShowCompleteConfirm(false);
      setCompleteAppt(null);
    }
  };
  const confirmCancelAppointment = async () => {
    if (!cancelAppt || isCancellingAppointment) return;
    setIsCancellingAppointment(true);
    try {
      const payload = { ...cancelAppt, status: "CANCELLED", patientId: cancelAppt.patient?.id ?? cancelAppt.patientId };
      const updated = await updateAppointment(cancelAppt.id, payload);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success("Rendez-vous annulé ");
    } catch (err) {
      console.error("Error marking cancelled:", err);
      toast.error("Erreur lors du changement d'état ");
    } finally {
      setIsCancellingAppointment(false);
      setShowCancelConfirm(false);
      setCancelAppt(null);
    }
  };

 const handleSubmit = async (e) => {
   e.preventDefault();
   if (isSavingAppointment) return;
   setIsSavingAppointment(true);
   try {
     let patientId = formData.patientId;

    if (isNewPatient) {
      const newP = await createPatient(newPatient);
      patientId = newP.id;
    }

    let baseDate = formBaseDate ? new Date(formBaseDate) : new Date();
	    if (!formBaseDate) {
	      if (selectedDate === "tomorrow") baseDate.setDate(baseDate.getDate() + 1);
	      if (selectedDate === "custom" && customDate) {
	        const [year, month, day] = customDate.split("-");
	        baseDate = new Date(Number(year), Number(month) - 1, Number(day));
	      }
	    }

      let resolvedHour = Number(formData.hour);
      if (use12HourFormat) {
        if (Number.isNaN(resolvedHour) || resolvedHour < 1 || resolvedHour > 12) {
          toast.error("Heure invalide");
          return;
        }
        const period = String(formData.period || "AM").toUpperCase();
        if (period === "PM" && resolvedHour !== 12) resolvedHour += 12;
        if (period === "AM" && resolvedHour === 12) resolvedHour = 0;
      } else {
        if (Number.isNaN(resolvedHour) || resolvedHour < 0 || resolvedHour > 23) {
          toast.error("Heure invalide");
          return;
        }
      }

      const resolvedMinute = Number(formData.minute);
      if (Number.isNaN(resolvedMinute) || resolvedMinute < 0 || resolvedMinute > 59) {
        toast.error("Minutes invalides");
        return;
      }
      if (resolvedMinute % 15 !== 0) {
        toast.error("Les minutes doivent etre par pas de 15");
        return;
      }

      const startMinutesOfDay = resolvedHour * 60 + resolvedMinute;
      if (
        startMinutesOfDay < workingHours.startMinutes ||
        startMinutesOfDay >= workingHours.endMinutes
      ) {
        toast.error("Heure hors horaires de travail");
        return;
      }

		    const start = new Date(
		      baseDate.getFullYear(),
		      baseDate.getMonth(),
		      baseDate.getDate(),
		      resolvedHour,
		      resolvedMinute,
		      0
		    );

    const end = new Date(start.getTime() + (formData.duration || slotDuration) * 60000);

    const formatLocalISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const startStr = formatLocalISO(start);
    const endStr = formatLocalISO(end);

    const payload = {
      dateTimeStart: startStr,
      dateTimeEnd: endStr,
      status: formData.status,
      patientId,
    };

    if (isEditing && formData.id) {
      await updateAppointment(formData.id, payload);
    } else {
      await createAppointment(payload);
    }

    const updated = await getAppointments();
    setAppointments(updated);

    toast.success(isEditing ? "Rendez-vous modifié !" : "Rendez-vous ajouté !");
    closeModal(); // Reset form and close modal
  } catch (err) {
    console.error("Error saving appointment:", err);

    if (err.response && err.response.status === 409) {
      toast.error(
        isEditing
          ? "Impossible de modifier le rendez-vous : il chevauche un autre rendez-vous !"
          : "Impossible de créer le rendez-vous : il chevauche un autre rendez-vous !"
      );
    } else {
      toast.error(
        getApiErrorMessage(
          err,
          isEditing
            ? "Erreur lors de la modification du rendez-vous"
            : "Erreur lors de l'enregistrement du rendez-vous"
        )
      );
    }
  } finally {
    setIsSavingAppointment(false);
  }
};


  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteAppointment = async () => {
    if (isDeletingAppointment) return;
    setIsDeletingAppointment(true);
    try {
      await deleteAppointment(confirmDelete);
      setAppointments((prev) => prev.filter((a) => a.id !== confirmDelete));
      toast.success("Rendez-vous supprimé ");
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression "));
    } finally {
      setIsDeletingAppointment(false);
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  const formatTime = (dt) => formatHour(dt);

  const hourBounds24 = useMemo(() => {
    const earliest = Math.floor(workingHours.startMinutes / 60);
    const latest = Math.floor((workingHours.endMinutes - 1) / 60);
    return {
      earliest: Math.max(0, earliest),
      latest: Math.min(23, latest),
    };
  }, [workingHours]);

  const hour24ForMinuteOptions = useMemo(() => {
    const hourNum = Number(formData.hour);
    if (Number.isNaN(hourNum)) return null;

    if (!use12HourFormat) {
      return hourNum;
    }

    if (hourNum < 1 || hourNum > 12) return null;
    const period = String(formData.period || "AM").toUpperCase();
    let resolved = hourNum;
    if (period === "PM" && resolved !== 12) resolved += 12;
    if (period === "AM" && resolved === 12) resolved = 0;
    return resolved;
  }, [formData.hour, formData.period, use12HourFormat]);

  const allowedMinuteOptions = useMemo(() => {
    if (hour24ForMinuteOptions === null) return [];
    return QUARTER_MINUTES.filter((minute) => {
      const totalMinutes = hour24ForMinuteOptions * 60 + Number(minute);
      return totalMinutes >= workingHours.startMinutes && totalMinutes < workingHours.endMinutes;
    });
  }, [hour24ForMinuteOptions, workingHours]);

  useEffect(() => {
    if (!showModal || openedFromSlot) return;
    if (!allowedMinuteOptions.length) return;
    const current = String(formData.minute).padStart(2, "0");
    if (!allowedMinuteOptions.includes(current)) {
      setFormData((prev) => ({ ...prev, minute: allowedMinuteOptions[0] }));
    }
  }, [allowedMinuteOptions.join(","), formData.minute, showModal, openedFromSlot]);

  useEffect(() => {
    if (!minuteDropdownOpen) return;
    if (!allowedMinuteOptions.length) {
      setMinuteDropdownOpen(false);
      return;
    }

    const onMouseDown = (event) => {
      if (!minuteDropdownRef.current) return;
      if (!minuteDropdownRef.current.contains(event.target)) {
        setMinuteDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [minuteDropdownOpen, allowedMinuteOptions.length]);

  const closeModal = () => {
    setShowModal(false);
    setFormBaseDate(null);
    setMinuteDropdownOpen(false);
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: "",
      minute: "",
      status: "SCHEDULED",
      duration: slotDuration,
      period: "AM",
    });
    setIsNewPatient(false);
    setNewPatient({ firstname: "", lastname: "", phone: "", age: "", sex: "Homme" });
    setPatientSearch("");
    setIsEditing(false);
    setOpenedFromSlot(false);
  };

  const slots = React.useMemo(() => buildSlotsForDate(getSelectedDayBaseDate()), [appointments, selectedDate, customDate, slotDuration, workingHours]);

  const weekStart = React.useMemo(() => addDays(getSelectedDayBaseDate(), weekOffset), [weekOffset, selectedDate, customDate]);
  const weekDays = React.useMemo(() => Array.from({ length: 4 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const weekDayStart = React.useMemo(() => buildDateAtMinutes(weekStart, workingHours.startMinutes), [weekStart, workingHours]);
  const weekDayEnd = React.useMemo(() => {
    const lastDay = addDays(weekStart, 3);
    return workingHours.endMinutes === 24 * 60
      ? addDays(startOfDay(lastDay), 1)
      : buildDateAtMinutes(lastDay, workingHours.endMinutes);
  }, [weekStart, workingHours]);

  const appointmentsByDay = React.useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[toDateKey(d)] = [];
    });
    appointments.forEach((a) => {
      const start = new Date(a.dateTimeStart);
      if (start < weekDayStart || start > weekDayEnd) return;
      const key = toDateKey(start);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart)));
    return map;
  }, [appointments, weekDays, weekDayStart, weekDayEnd]);

  const alignedSlotsByDay = React.useMemo(() => {
    if (!slots.length) return {};
    const baseSlots = slots;
    const baseKeys = baseSlots.map((slot) => {
      const startMin = slot.start.getHours() * 60 + slot.start.getMinutes();
      const endMin = slot.end.getHours() * 60 + slot.end.getMinutes();
      return `${startMin}-${endMin}`;
    });

    return weekDays.reduce((map, day) => {
      const daySlots = buildSlotsForDate(day);
      const dayMap = new Map(
        daySlots.map((slot) => {
          const startMin = slot.start.getHours() * 60 + slot.start.getMinutes();
          const endMin = slot.end.getHours() * 60 + slot.end.getMinutes();
          return [`${startMin}-${endMin}`, slot];
        })
      );

      map[toDateKey(day)] = baseSlots.map((baseSlot, index) => {
        const key = baseKeys[index];
        const match = dayMap.get(key);
        if (match) return match;

        const start = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          baseSlot.start.getHours(),
          baseSlot.start.getMinutes(),
          0
        );
        const end = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          baseSlot.end.getHours(),
          baseSlot.end.getMinutes(),
          0
        );
        return { start, end, appointments: [] };
      });

      return map;
    }, {});
  }, [appointments, slots, weekDays, slotDuration, workingHours]);

  const getPatientName = (appt) => {
    if (!appt) return "";
    if (appt.patient && appt.patient.firstname && appt.patient.lastname) {
      return `${appt.patient.firstname} ${appt.patient.lastname}`;
    }
    const patient = patients.find((p) => p.id === appt.patientId);
    return patient ? `${patient.firstname} ${patient.lastname}` : "Inconnu";
  };

  const appointmentNumbersForSelectedDay = React.useMemo(() => {
    const selectedDay = getSelectedDayBaseDate();
    const selectedDayAppointments = appointments
      .filter((appt) => isSameDay(new Date(appt.dateTimeStart), selectedDay))
      .sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart));

    return selectedDayAppointments.reduce((map, appt, index) => {
      map[appt.id] = index + 1;
      return map;
    }, {});
  }, [appointments, selectedDate, customDate]);

  const appointmentNumbersByWeekDay = React.useMemo(() => {
    return weekDays.reduce((map, day) => {
      const key = toDateKey(day);
      const sortedAppointments = [...(appointmentsByDay[key] || [])].sort(
        (a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart)
      );

      map[key] = sortedAppointments.reduce((dayMap, appt, index) => {
        dayMap[appt.id] = index + 1;
        return dayMap;
      }, {});

      return map;
    }, {});
  }, [appointmentsByDay, weekDays]);

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Rendez-vous"
        subtitle="Chargement du planning du cabinet"
        variant="schedule"
      />
    );
  }

  return (
    <div className="appointments-page">
      <div className="appointments-container">
        <PageHeader title="Rendez-vous" subtitle="Liste des rendez-vous" align="left" />

        {/* Controls */}
        <div className="appointments-controls">
          <div className="date-selector">
            <button className={viewMode === "day" ? "active" : ""} onClick={() => setViewMode("day")}>
              Jour
            </button>
            <button className={viewMode === "week" ? "active" : ""} onClick={() => setViewMode("week")}>
              4 jours
            </button>

            {viewMode === "day" && (
              <>
                <button className={selectedDate === "today" ? "active" : ""} onClick={() => { setSelectedDate("today"); setCustomDate(""); }}>
                  Aujourd'hui
                </button>

                <button className={selectedDate === "tomorrow" ? "active" : ""} onClick={() => { setSelectedDate("tomorrow"); setCustomDate(""); }}>
                  Demain
                </button>

                <input type="date" value={customDate} onChange={(e) => { setCustomDate(e.target.value); setSelectedDate("custom"); }} />
              </>
            )}

            {viewMode === "week" && (
              <div className="week-nav">
                <button type="button" onClick={() => setWeekOffset((v) => v - 1)} className="week-nav-btn" title="Jour précédent">
                  <ChevronLeft size={16} />
                </button>
                <div className="week-nav-label">{formatWeekRange(weekStart)}</div>
                <button type="button" onClick={() => setWeekOffset((v) => v + 1)} className="week-nav-btn" title="Jour suivant">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={() => { setOpenedFromSlot(false); setShowModal(true); }}
          >
            <Plus size={16} /> Ajouter un rendez-vous
          </button>
        </div>

        <div className="slot-duration-selector" style={{ marginBottom: "16px" }}>
          <label>Durée du créneau :</label>
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="slot-duration-select"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        {viewMode === "day" ? (
          <div className="appointments-slots">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className={`slot ${slot.appointments.length ? "SCHEDULED" : "empty"} ${
                  slot.appointments.some((a) => a.status === "COMPLETED") ? "COMPLETED" : ""
                } ${slot.appointments.some((a) => a.status === "CANCELLED") ? "CANCELLED" : ""}`}
                onClick={() => handleSlotClick(slot)}
              >
                <div className="slot-time">
                  {formatTime(slot.start)} - {formatTime(slot.end)}
                </div>
                {slot.appointments.length ? (
                  slot.appointments.map((appt) => (
                    <div key={appt.id} className="appointment-row" onClick={() => handleEditAppointment(appt)}>
                      <div className="slot-patient">
                        <span className="appointment-number">
                          {appointmentNumbersForSelectedDay[appt.id] ?? "-"}
                        </span>
                        <span>{getPatientName(appt)}</span>
                      </div>
                      <span className={`status-chip ${appt.status}`}>{statusLabels[appt.status] || appt.status}</span>

                      {(appt.patient?.id || appt.patientId) && (
                        <button
                          className="action-btn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${appt.patient?.id ?? appt.patientId}`);
                          }}
                          title="Ouvrir le profil patient"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      )}

                      {appt.status === "SCHEDULED" && (
                        <button
                          className="action-btn complete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkCompleted(appt);
                          }}
                        >
                          <Check size={16} />
                        </button>
                      )}

                      {appt.status !== "COMPLETED" && (
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(appt.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {appt.status === "SCHEDULED" && (
                        <button
                          className="action-btn cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkCancelled(appt);
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="slot-patient">Disponible</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="four-day-grid">
            <div className="four-day-header">
              <div className="four-day-time-header"></div>
              {weekDays.map((d) => (
                <div
                  key={toDateKey(d)}
                  className={`four-day-header-cell ${isSameDay(d, new Date()) ? "today" : ""} ${
                    d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""
                  }`}
                >
                  {formatDayLabel(d)}
                </div>
              ))}
            </div>

            <div className="four-day-body">
              {slots.map((baseSlot, rowIdx) => (
                <div key={rowIdx} className="four-day-row">
                  <div className="four-day-time-cell">
                    {formatTime(baseSlot.start)} - {formatTime(baseSlot.end)}
                  </div>
                  {weekDays.map((day) => {
                    const key = toDateKey(day);
                    const daySlots = alignedSlotsByDay[key] || [];
                    const slot = daySlots[rowIdx];
                    if (!slot) return <div key={`${key}-${rowIdx}`} className="four-day-cell" />;

                    return (
                      <div key={`${key}-${rowIdx}`} className="four-day-cell">
                        <div
                          className={`slot ${slot.appointments.length ? "SCHEDULED" : "empty"} ${
                            slot.appointments.some((a) => a.status === "COMPLETED") ? "COMPLETED" : ""
                          } ${slot.appointments.some((a) => a.status === "CANCELLED") ? "CANCELLED" : ""}`}
                          onClick={() => handleSlotClick(slot)}
                        >
                          {slot.appointments.length ? (
                            slot.appointments.map((appt) => (
                              <div key={appt.id} className="appointment-row" onClick={() => handleEditAppointment(appt)}>
                              <div className="slot-patient">
                                  <span>{getPatientName(appt)}</span>
                              </div>
                                <span className={`status-chip ${appt.status}`}>{statusLabels[appt.status] || appt.status}</span>

                                {appt.status !== "COMPLETED" && (
                                  <button
                                    className="action-btn delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(appt.id);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="slot-patient">Disponible</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Appointment Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{isEditing ? "Modifier Rendez-vous" : "Ajouter Rendez-vous"}</h2>
              <form onSubmit={handleSubmit} className="modal-form">
                <label className={`chip-toggle ${isNewPatient ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isNewPatient}
                    onChange={(e) => setIsNewPatient(e.target.checked)}
                  />
                  Nouveau patient ?
                </label>

                {isNewPatient ? (
                  <>
                    <input type="text" placeholder="Prénom" value={newPatient.firstname} onChange={(e) => setNewPatient({...newPatient, firstname: e.target.value})} required />
                    <input type="text" placeholder="Nom" value={newPatient.lastname} onChange={(e) => setNewPatient({...newPatient, lastname: e.target.value})} required />
                    <input type="text" placeholder="Téléphone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} required />
                    <input type="number" placeholder="Âge" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} required />
                    <div className="form-field">
                      <span className="field-label">Sexe</span>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input type="radio" name="sex" value="Homme" checked={newPatient.sex === "Homme"} onChange={handleSexChange} required />
                          <span>Homme</span>
                        </label>
                        <label className="radio-option">
                          <input type="radio" name="sex" value="Femme" checked={newPatient.sex === "Femme"} onChange={handleSexChange} required />
                          <span>Femme</span>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="form-field" style={{ position: "relative" }}>
                    <input type="text" placeholder="Search patient..." value={patientSearch} onChange={(e) => handlePatientSearch(e.target.value)} autoComplete="off" required />
                    {searchResults.length > 0 && (
                      <ul className="patient-search-dropdown">
                        {searchResults.map((p) => (
                          <li
                            key={p.id}
                            onClick={() => {
                              setFormData({...formData, patientId: p.id, patientName: `${p.firstname} ${p.lastname}`});
                              setPatientSearch(`${p.firstname} ${p.lastname}`);
                              setSearchResults([]);
                            }}
                          >
                            {p.firstname} {p.lastname} • {p.phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Appointment Time */}
             {/* Appointment Time */}
{!openedFromSlot && (
  <div className="form-field">
    <label>Choisir l'heure</label>

		    <div className="time-input-group">

        <input
          type="number"
          placeholder="HH"
          min={use12HourFormat ? 1 : hourBounds24.earliest}
          max={use12HourFormat ? 12 : hourBounds24.latest}
          value={formData.hour || ""}
          onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
          required
        />

        <span>:</span>

        <div className="modern-dropdown minute-dropdown" ref={minuteDropdownRef}>
          <button
            type="button"
            className={`dropdown-trigger ${minuteDropdownOpen ? "open" : ""}`}
            onClick={() => {
              if (!allowedMinuteOptions.length) return;
              setMinuteDropdownOpen((prev) => !prev);
            }}
            disabled={!allowedMinuteOptions.length}
          >
            <span>
              {formData.minute === "" ? "--" : String(formData.minute).padStart(2, "0")}
            </span>
          </button>

          {minuteDropdownOpen && (
            <ul className="dropdown-menu" role="listbox" aria-label="Minutes">
              {allowedMinuteOptions.map((minute) => (
                <li
                  key={minute}
                  role="option"
                  aria-selected={String(formData.minute).padStart(2, "0") === minute}
                  onClick={() => {
                    setFormData({ ...formData, minute });
                    setMinuteDropdownOpen(false);
                  }}
                >
                  {minute}
                </li>
              ))}
            </ul>
          )}
        </div>

        {use12HourFormat && (
          <button
            type="button"
            className="am-pm-toggle"
            onClick={() =>
              setFormData({
                ...formData,
                period: (formData.period || "AM") === "AM" ? "PM" : "AM",
              })
            }
          >
            {formData.period || "AM"}
          </button>
        )}
		
		    </div>
		  </div>
		)}
                {/* Appointment Duration Selector */}
                <div className="form-field">
                  <label>Durée du rendez-vous :</label>
                  <button
                    type="button"
                    className="am-pm-toggle duration-toggle"
                    onClick={() => {
                      const current = Number(formData.duration || slotDuration);
                      const idx = durationOptions.indexOf(current);
                      const next =
                        idx === -1
                          ? durationOptions[0]
                          : durationOptions[(idx + 1) % durationOptions.length];
                      setFormData({ ...formData, duration: next });
                    }}
                  >
                    {(formData.duration || slotDuration)} min
                  </button>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary2" disabled={isSavingAppointment}>
                    {isSavingAppointment ? "Enregistrement..." : isEditing ? "Enregistrer" : "Ajouter"}
                  </button>
                  <button type="button" className="btn-cancel" onClick={closeModal}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete */}
        {showConfirm && confirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]" onClick={() => setShowConfirm(false)}>
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer le rendez-vous ?</h2>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer le rendez-vous de {getPatientName(appointments.find(a => a.id === confirmDelete))} ?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
                <button onClick={confirmDeleteAppointment} disabled={isDeletingAppointment} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">
                  {isDeletingAppointment ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Complete */}
        {showCompleteConfirm && completeAppt && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Marquer comme COMPLET ?</h2>
              <p>Êtes-vous sûr de vouloir marquer le rendez-vous de {getPatientName(completeAppt)} comme COMPLET ?</p>
              <div className="modal-actions">
                <button onClick={() => setShowCompleteConfirm(false)} className="btn-cancel">Annuler</button>
                <button onClick={confirmCompleteAppointment} disabled={isCompletingAppointment} className="btn-primary2">
                  {isCompletingAppointment ? "Confirmation..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Cancel */}
        {showCancelConfirm && cancelAppt && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Annuler le rendez-vous ?</h2>
              <p>Êtes-vous sûr de vouloir annuler le rendez-vous de {getPatientName(cancelAppt)} ?</p>
              <div className="modal-actions">
                <button onClick={() => setShowCancelConfirm(false)} className="btn-cancel">Annuler</button>
                <button onClick={confirmCancelAppointment} disabled={isCancellingAppointment} className="btn-primary2">
                  {isCancellingAppointment ? "Confirmation..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}












