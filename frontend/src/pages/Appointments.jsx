import React, { useMemo, useRef, useState, useEffect } from "react";
import { X, Plus, Check, Edit2, ChevronLeft, ChevronRight } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  getAppointments,
  createAppointment,
  updateAppointment,
  shiftAppointments,
} from "../services/appointmentService";
import { createPatient, getPatients } from "../services/patientService";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import PatientDangerIcon from "../components/PatientDangerIcon";
import ModernDropdown from "../components/ModernDropdown";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import FieldError from "../components/FieldError";
import { AGE_LIMITS, FIELD_LIMITS, validateAge, validateText } from "../utils/validation";
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

  const openPatientProfile = (appt) => {
    const patientId = appt?.patient?.id ?? appt?.patientId ?? null;
    if (!patientId) return;
    navigate(`/patients/${patientId}`);
  };

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [timeFormat, setTimeFormat] = useState(() => getTimeFormatPreference());

  const patientsById = useMemo(() => {
    const map = new Map();
    patients.forEach((p) => {
      if (p?.id != null) map.set(p.id, p);
    });
    return map;
  }, [patients]);

  const getPatientForAppt = (appt) => {
    const id = appt?.patient?.id ?? appt?.patientId ?? null;
    if (id == null) return null;
    return patientsById.get(id) || null;
  };
  const use12HourFormat = timeFormat === TIME_FORMATS.TWELVE_HOURS;
  const [showModal, setShowModal] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);
  const [isCancellingAppointment, setIsCancellingAppointment] = useState(false);
  const [workingHours, setWorkingHours] = useState(() => getWorkingHoursWindow());
  const [minuteDropdownOpen, setMinuteDropdownOpen] = useState(false);
  const minuteDropdownRef = useRef(null);

  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [autoAdvanceFromIndex, setAutoAdvanceFromIndex] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [previewPrevIndex, setPreviewPrevIndex] = useState(null);
  const [previewDirection, setPreviewDirection] = useState("next");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isShiftingAppointments, setIsShiftingAppointments] = useState(false);
  const planningSlotRefs = useRef([]);
  const planningHighlightTimeoutRef = useRef(null);
  const [planningHighlightIndex, setPlanningHighlightIndex] = useState(null);
  const quickHighlightTimeoutRef = useRef(null);
  const [quickHighlightIndex, setQuickHighlightIndex] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    direction: "forward",
    duration: 15,
    scope: "all",
    startTime: "",
    endTime: "",
  });
  const [shiftErrors, setShiftErrors] = useState({});

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
  const isCancelledStatus = (status) => status === "CANCELLED" || status === "CANCELED";
  const filterCancelledAppointments = (list) =>
    (Array.isArray(list) ? list : []).filter((a) => !isCancelledStatus(a.status));

  const handleSexChange = (e) => {
    setNewPatient({ ...newPatient, sex: e.target.value });
    if (fieldErrors.sex) setFieldErrors((prev) => ({ ...prev, sex: "" }));
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
        setAppointments(filterCancelledAppointments(appointmentsData));
      } catch (err) {
        console.error("Error fetching appointments page data:", err);
        toast.error(getApiErrorMessage(err, "Erreur lors du chargement des rendez-vous"));
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
    setFormData((s) => ({ ...s, patientId: null, patientName: "" }));
    if (fieldErrors.patientId) setFieldErrors((prev) => ({ ...prev, patientId: "" }));
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
    if (slot.appointments.length > 0) {
      openPatientProfile(slot.appointments[0]);
      return;
    }
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
    setFieldErrors({});
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
    setFieldErrors({});
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
    setFieldErrors({});
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
    const completedSlotIndex = slots.findIndex((slot) =>
      slot.appointments?.some((a) => a.id === completeAppt.id)
    );
    try {
      const payload = { ...completeAppt, status: "COMPLETED", patientId: completeAppt.patient?.id ?? completeAppt.patientId };
      const updated = await updateAppointment(completeAppt.id, payload);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      if (completedSlotIndex >= 0) {
        setAutoAdvanceFromIndex(completedSlotIndex);
      }
      toast.success("Rendez-vous complété ");
    } catch (err) {
      console.error("Error marking complete:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors du changement d'état "));
    } finally {
      setIsCompletingAppointment(false);
      setShowCompleteConfirm(false);
      setCompleteAppt(null);
    }
  };
  const confirmCancelAppointment = async () => {
    if (!cancelAppt || isCancellingAppointment) return;
    setIsCancellingAppointment(true);
    const cancelledSlotIndex = slots.findIndex((slot) =>
      slot.appointments?.some((a) => a.id === cancelAppt.id)
    );
    try {
      const payload = { ...cancelAppt, status: "CANCELLED", patientId: cancelAppt.patient?.id ?? cancelAppt.patientId };
      const updated = await updateAppointment(cancelAppt.id, payload);
      setAppointments((prev) => prev.filter((a) => a.id !== updated.id));
      if (cancelledSlotIndex >= 0) {
        setAutoAdvanceFromIndex(cancelledSlotIndex);
      }
      toast.success("Rendez-vous annulé ");
    } catch (err) {
      console.error("Error marking cancelled:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors du changement d'état "));
    } finally {
      setIsCancellingAppointment(false);
      setShowCancelConfirm(false);
      setCancelAppt(null);
    }
  };

 const handleSubmit = async (e) => {
   e.preventDefault();
   if (isSavingAppointment) return;

   const nextErrors = {};

   if (isNewPatient) {
     const firstnameError = validateText(newPatient.firstname, {
       label: "Prénom",
       required: true,
       minLength: FIELD_LIMITS.PERSON_NAME_MIN,
       maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
     });
     if (firstnameError) nextErrors.firstname = firstnameError;

     const lastnameError = validateText(newPatient.lastname, {
       label: "Nom",
       required: true,
       minLength: FIELD_LIMITS.PERSON_NAME_MIN,
       maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
     });
     if (lastnameError) nextErrors.lastname = lastnameError;

     const ageError = validateAge(newPatient.age);
     if (ageError) nextErrors.age = ageError;

     if (!String(newPatient.phone || "").trim()) nextErrors.phone = "Le numéro de téléphone est obligatoire.";
     else if (!isValidPhoneNumber(newPatient.phone)) nextErrors.phone = "Numéro de téléphone invalide.";

     if (!String(newPatient.sex || "").trim()) nextErrors.sex = "Le sexe est obligatoire.";
   } else if (!formData.patientId) {
     nextErrors.patientId = "Veuillez sélectionner un patient.";
   }

   let baseDate = formBaseDate ? new Date(formBaseDate) : new Date();
   if (!formBaseDate) {
     if (selectedDate === "tomorrow") baseDate.setDate(baseDate.getDate() + 1);
     if (selectedDate === "custom" && customDate) {
       const [year, month, day] = customDate.split("-");
       baseDate = new Date(Number(year), Number(month) - 1, Number(day));
     }
   }

   const hourRaw = String(formData.hour ?? "").trim();
   let resolvedHour = Number.NaN;
   if (!hourRaw) nextErrors.hour = "L'heure est obligatoire.";
   else {
     resolvedHour = Number(hourRaw);
     if (use12HourFormat) {
       if (Number.isNaN(resolvedHour) || resolvedHour < 1 || resolvedHour > 12) {
         nextErrors.hour = "Heure invalide.";
       } else {
         const period = String(formData.period || "AM").toUpperCase();
         if (period === "PM" && resolvedHour !== 12) resolvedHour += 12;
         if (period === "AM" && resolvedHour === 12) resolvedHour = 0;
       }
     } else if (Number.isNaN(resolvedHour) || resolvedHour < 0 || resolvedHour > 23) {
       nextErrors.hour = "Heure invalide.";
     }
   }

   const minuteRaw = String(formData.minute ?? "").trim();
   let resolvedMinute = Number.NaN;
   if (!minuteRaw) nextErrors.minute = "Les minutes sont obligatoires.";
   else {
     resolvedMinute = Number(minuteRaw);
     if (Number.isNaN(resolvedMinute) || resolvedMinute < 0 || resolvedMinute > 59) {
       nextErrors.minute = "Minutes invalides.";
     } else if (resolvedMinute % 15 !== 0) {
       nextErrors.minute = "Les minutes doivent être par pas de 15.";
     }
   }

   if (!nextErrors.hour && !nextErrors.minute) {
     const startMinutesOfDay = resolvedHour * 60 + resolvedMinute;
     if (
       startMinutesOfDay < workingHours.startMinutes ||
       startMinutesOfDay >= workingHours.endMinutes
     ) {
       nextErrors.hour = "Heure hors horaires de travail.";
     }
   }

   if (Object.keys(nextErrors).length) {
     setFieldErrors(nextErrors);
     return;
   }

   setFieldErrors({});
   setIsSavingAppointment(true);
   try {
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

    let patientId = formData.patientId;

    if (isNewPatient) {
      const rawAge = String(newPatient.age ?? "").trim();
      const newP = await createPatient({
        firstname: String(newPatient.firstname ?? "").trim(),
        lastname: String(newPatient.lastname ?? "").trim(),
        age: rawAge ? Number(rawAge) : null,
        sex: String(newPatient.sex ?? "").trim() || "Homme",
        phone: normalizePhoneInput(newPatient.phone),
      });

      setPatients((prev) => [...prev, newP]);
      setFormData((s) => ({
        ...s,
        patientId: newP.id,
        patientName: `${newP.firstname} ${newP.lastname}`,
      }));
      setPatientSearch(`${newP.firstname} ${newP.lastname}`);
      setSearchResults([]);
      setIsNewPatient(false);
      setNewPatient({ firstname: "", lastname: "", phone: "", age: "", sex: "Homme" });

      patientId = newP.id;
    }

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
    setAppointments(filterCancelledAppointments(updated));

    toast.success(isEditing ? "Rendez-vous modifié !" : "Rendez-vous ajouté !");
    closeModal(); // Reset form and close modal
  } catch (err) {
    console.error("Error saving appointment:", err);

    const backendFieldErrors = err?.response?.data?.fieldErrors;
    if (err?.response?.status === 400 && backendFieldErrors && typeof backendFieldErrors === "object") {
      const mapped = {};
      if (backendFieldErrors.patientId) mapped.patientId = backendFieldErrors.patientId;
      if (backendFieldErrors.status) mapped.status = backendFieldErrors.status;
      if (backendFieldErrors.notes) mapped.notes = backendFieldErrors.notes;
      const timeError = backendFieldErrors.dateTimeEnd || backendFieldErrors.dateTimeStart;
      if (timeError) mapped.hour = timeError;

      setFieldErrors(mapped);
      toast.error(getApiErrorMessage(err, "Veuillez corriger les informations."));
      return;
    }

    if (err.response && err.response.status === 409) {
      toast.error(
        getApiErrorMessage(
          err,
          isEditing
            ? "Impossible de modifier le rendez-vous : il chevauche un autre rendez-vous !"
            : "Impossible de créer le rendez-vous : il chevauche un autre rendez-vous !"
        )
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


  const openShiftModal = () => {
    setShiftForm({
      direction: "forward",
      duration: 15,
      scope: "all",
      startTime: formatMinutesToTime(workingHours.startMinutes),
      endTime: formatMinutesToTime(workingHours.endMinutes),
    });
    setShiftErrors({});
    setShowShiftModal(true);
  };

  const applyShiftAppointments = async () => {
    if (isShiftingAppointments) return;
    const baseDate = getSelectedDayBaseDate();
    const dayAppointments = appointments.filter((appt) =>
      isSameDay(new Date(appt.dateTimeStart), baseDate)
    );
    const movableAppointments = dayAppointments.filter(
      (appt) => appt.status === "SCHEDULED"
    );

    let rangeFilter = () => true;
    if (shiftForm.scope === "range") {
      const startMin = parseTimeToMinutes(shiftForm.startTime);
      const endMin = parseTimeToMinutes(shiftForm.endTime);
      if (startMin === null || endMin === null || endMin <= startMin) {
        const nextErrors = {};
        if (startMin === null) nextErrors.startTime = "Heure de début obligatoire.";
        if (endMin === null) nextErrors.endTime = "Heure de fin obligatoire.";
        if (startMin !== null && endMin !== null && endMin <= startMin) {
          nextErrors.endTime = "L'heure de fin doit être après l'heure de début.";
        }
        setShiftErrors(nextErrors);
        return;
      }
      rangeFilter = (appt) => {
        const start = new Date(appt.dateTimeStart);
        const mins = start.getHours() * 60 + start.getMinutes();
        return mins >= startMin && mins < endMin;
      };
    }

    const toShift = movableAppointments.filter(rangeFilter);
    if (!toShift.length) {
      toast.info("Aucun rendez-vous à décaler");
      return;
    }

    setIsShiftingAppointments(true);
    try {
      await shiftAppointments({
        date: baseDate.toISOString().split("T")[0],
        direction: shiftForm.direction,
        minutes: Number(shiftForm.duration),
        scope: shiftForm.scope,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        workingDayStartMinutes: workingHours.startMinutes,
        workingDayEndMinutes: workingHours.endMinutes,
      });

      const updated = await getAppointments();
      setAppointments(filterCancelledAppointments(updated));
      toast.success("Rendez-vous décalés !");
      setShowShiftModal(false);
    } catch (err) {
      console.error("Error shifting appointments:", err);
      const backendFieldErrors = err?.response?.data?.fieldErrors;
      if (err?.response?.status === 400 && backendFieldErrors && typeof backendFieldErrors === "object") {
        const mapped = {};
        if (backendFieldErrors.startTime) mapped.startTime = backendFieldErrors.startTime;
        if (backendFieldErrors.endTime) mapped.endTime = backendFieldErrors.endTime;
        if (backendFieldErrors.scope) mapped.scope = backendFieldErrors.scope;
        setShiftErrors(mapped);
        toast.error(getApiErrorMessage(err, "Veuillez corriger les informations."));
        return;
      }
      toast.error(getApiErrorMessage(err, "Erreur lors du décalage"));
    } finally {
      setIsShiftingAppointments(false);
    }
  };

  const formatTime = (dt) => formatHour(dt);
  const formatMinutesToTime = (minutes) => {
    const hrs = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hrs}:${mins}`;
  };
  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const [h, m] = value.split(":").map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

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
    setFieldErrors({});
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

  const selectedDayBaseDate = useMemo(() => getSelectedDayBaseDate(), [selectedDate, customDate]);

  const slots = useMemo(
    () => buildSlotsForDate(selectedDayBaseDate),
    [appointments, selectedDayBaseDate, slotDuration, workingHours]
  );

  const weekStart = useMemo(() => addDays(selectedDayBaseDate, weekOffset), [weekOffset, selectedDayBaseDate]);
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
    const selectedDayAppointments = appointments
      .filter((appt) => isSameDay(new Date(appt.dateTimeStart), selectedDayBaseDate))
      .sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart));

    return selectedDayAppointments.reduce((map, appt, index) => {
      map[appt.id] = index + 1;
      return map;
    }, {});
  }, [appointments, selectedDayBaseDate]);

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
  const todayBaseDate = useMemo(() => startOfDay(new Date()), []);

  // "Accès rapide" follows the currently selected day in day view; in 4-day view it stays on today.
  const previewBaseDate = useMemo(
    () => (viewMode === "day" ? selectedDayBaseDate : todayBaseDate),
    [viewMode, selectedDayBaseDate, todayBaseDate]
  );
  const previewSlots = useMemo(
    () => buildSlotsForDate(previewBaseDate),
    [appointments, slotDuration, workingHours, previewBaseDate]
  );

  const firstScheduledSlotIndex = useMemo(
    () => previewSlots.findIndex((slot) => slot.appointments?.some((a) => a.status === "SCHEDULED")),
    [previewSlots]
  );

  const nextAvailableSlotIndex = useMemo(() => {
    if (!previewSlots.length) return -1;
    // Always jump to the earliest empty slot (even for today).
    return previewSlots.findIndex((slot) => !slot.appointments?.length);
  }, [previewSlots]);

  const planningFirstScheduledSlotIndex = useMemo(
    () => slots.findIndex((slot) => slot.appointments?.some((a) => a.status === "SCHEDULED")),
    [slots]
  );

  const planningNextAvailableSlotIndex = useMemo(() => {
    if (!slots.length) return -1;
    // Always jump to the earliest empty slot (even for today).
    return slots.findIndex((slot) => !slot.appointments?.length);
  }, [slots]);

  const setPlanningHighlight = (idx) => {
    if (planningHighlightTimeoutRef.current) {
      clearTimeout(planningHighlightTimeoutRef.current);
      planningHighlightTimeoutRef.current = null;
    }
    setPlanningHighlightIndex(idx);
    planningHighlightTimeoutRef.current = setTimeout(() => {
      setPlanningHighlightIndex(null);
      planningHighlightTimeoutRef.current = null;
    }, 1100);
  };

  const setQuickHighlight = (idx) => {
    if (quickHighlightTimeoutRef.current) {
      clearTimeout(quickHighlightTimeoutRef.current);
      quickHighlightTimeoutRef.current = null;
    }
    setQuickHighlightIndex(idx);
    quickHighlightTimeoutRef.current = setTimeout(() => {
      setQuickHighlightIndex(null);
      quickHighlightTimeoutRef.current = null;
    }, 700);
  };

  const scrollToPlanningSlot = (idx) => {
    if (idx === null || idx === undefined || idx < 0 || idx >= slots.length) return;
    const el = planningSlotRefs.current[idx];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
    setPlanningHighlight(idx);
  };

  const goToPlanningCurrentPatientSlot = () => {
    if (planningFirstScheduledSlotIndex >= 0) {
      scrollToPlanningSlot(planningFirstScheduledSlotIndex);
    }
  };

  const goToPlanningNextAvailableSlot = () => {
    if (planningNextAvailableSlotIndex >= 0) {
      scrollToPlanningSlot(planningNextAvailableSlotIndex);
    }
  };

  useEffect(() => {
    planningSlotRefs.current = new Array(slots.length);
  }, [slots.length]);

  useEffect(() => {
    return () => {
      if (planningHighlightTimeoutRef.current) {
        clearTimeout(planningHighlightTimeoutRef.current);
      }
      if (quickHighlightTimeoutRef.current) {
        clearTimeout(quickHighlightTimeoutRef.current);
      }
    };
  }, []);

  

  const activeSlot = activeSlotIndex !== null ? previewSlots[activeSlotIndex] : null;
  const canGoPrevSlot = activeSlotIndex !== null && activeSlotIndex > 0;
  const canGoNextSlot =
    activeSlotIndex !== null && activeSlotIndex < previewSlots.length - 1;

  const setActiveSlotAndFocus = (idx) => {
    if (idx === null || idx === undefined || idx < 0 || idx >= previewSlots.length) return;
    setActiveSlotIndex(idx);
  };

  const goToPrevAppointmentSlot = () => {
    if (!previewSlots.length) return;
    const current = activeSlotIndex ?? 0;
    const nextPos = Math.max(0, current - 1);
    setActiveSlotAndFocus(nextPos);
  };

  const goToNextAppointmentSlot = () => {
    if (!previewSlots.length) return;
    const current = activeSlotIndex ?? 0;
    const nextPos = Math.min(current + 1, previewSlots.length - 1);
    setActiveSlotAndFocus(nextPos);
  };

  const goToCurrentPatientSlot = () => {
    if (firstScheduledSlotIndex >= 0) {
      setActiveSlotAndFocus(firstScheduledSlotIndex);
      setQuickHighlight(firstScheduledSlotIndex);
    } else if (previewSlots.length) {
      setActiveSlotAndFocus(0);
      setQuickHighlight(0);
    }
  };

  const goToNextAvailableSlot = () => {
    if (nextAvailableSlotIndex >= 0) {
      setActiveSlotAndFocus(nextAvailableSlotIndex);
      setQuickHighlight(nextAvailableSlotIndex);
    }
  };

  const renderSlotCard = (slot, idx, options = {}) => {
    const { slotRef, isHighlighted } = options;
    if (!slot) {
      return (
        <div className="slot empty">
          <div className="slot-time">--:--</div>
          <div className="slot-patient">Disponible</div>
        </div>
      );
    }

    return (
      <div
        key={idx}
        className={`slot ${
          slot.appointments.length ? "SCHEDULED" : "empty"
        } ${
          slot.appointments.some((a) => a.status === "COMPLETED") ? "COMPLETED" : ""
        } ${slot.appointments.some((a) => a.status === "CANCELLED") ? "CANCELLED" : ""} ${
          isHighlighted ? "jump-highlight" : ""
        }`}
        ref={slotRef}
        onClick={() => {
          setActiveSlotIndex(idx);
          handleSlotClick(slot);
        }}
      >
        <div className="slot-time">
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </div>
        {slot.appointments.length ? (
          slot.appointments.map((appt) => {
            const apptPatient = getPatientForAppt(appt);
            return (
              <div
                key={appt.id}
                className="appointment-row"
                onClick={(e) => {
                  e.stopPropagation();
                  openPatientProfile(appt);
                }}
              >
                <div className="slot-patient">
                  <span className="appointment-number">
                    {appointmentNumbersForSelectedDay[appt.id] ?? "-"}
                  </span>
                  <span className="slot-patient-name">
                    <span className="slot-patient-text">{getPatientName(appt)}</span>
                    <PatientDangerIcon
                      show={!!apptPatient?.danger}
                      compact
                      dangerCancelled={apptPatient?.dangerCancelled}
                      dangerOwed={apptPatient?.dangerOwed}
                    />
                  </span>
                </div>
              <span className={`status-chip ${appt.status}`}>{statusLabels[appt.status] || appt.status}</span>

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
                  className="action-btn edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAppointment(appt);
                  }}
                  title="Mettre à jour"
                >
                  <Edit2 size={16} />
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
            );
          })
        ) : (
          <div className="slot-patient">Disponible</div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!previewSlots.length) {
      setActiveSlotIndex(null);
      return;
    }
    if (autoAdvanceFromIndex !== null) return;
    if (activeSlotIndex !== null && activeSlotIndex < previewSlots.length) return;
    setActiveSlotIndex(0);
  }, [
    previewSlots,
    activeSlotIndex,
    autoAdvanceFromIndex,
  ]);

  useEffect(() => {
    if (activeSlotIndex === null) {
      setPreviewIndex(null);
      setPreviewPrevIndex(null);
      return;
    }
    if (previewIndex === null) {
      setPreviewIndex(activeSlotIndex);
      return;
    }
    if (activeSlotIndex === previewIndex) return;
    const direction = activeSlotIndex > previewIndex ? "next" : "prev";
    setPreviewDirection(direction);
    setPreviewPrevIndex(previewIndex);
    setPreviewIndex(activeSlotIndex);
    const timeout = setTimeout(() => {
      setPreviewPrevIndex(null);
    }, 240);
    return () => clearTimeout(timeout);
  }, [activeSlotIndex, previewIndex]);

  useEffect(() => {
    if (autoAdvanceFromIndex === null) return;
    const nextIdx = Math.min(autoAdvanceFromIndex + 1, previewSlots.length - 1);
    setActiveSlotIndex(nextIdx >= 0 ? nextIdx : null);
    setAutoAdvanceFromIndex(null);
  }, [autoAdvanceFromIndex, previewSlots]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (viewMode !== "day") return;
      if (showModal) return;
      const target = event.target;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isTyping) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevAppointmentSlot();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextAppointmentSlot();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, activeSlotIndex, previewSlots.length]);

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

        <h3 className="section-title">Accès rapide</h3>
        <div className="slot-preview">
          <div className="slot-preview-nav">
            <div className="slot-preview-group left">
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToPrevAppointmentSlot}
                disabled={!canGoPrevSlot}
              >
                Précédent
              </button>
            </div>
            <div className="slot-preview-group center">
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToCurrentPatientSlot}
                disabled={firstScheduledSlotIndex < 0}
              >
                Patient en cours
              </button>
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToNextAvailableSlot}
                disabled={nextAvailableSlotIndex < 0}
              >
                Créneau libre
              </button>
            </div>
            <div className="slot-preview-group right">
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToNextAppointmentSlot}
                disabled={!canGoNextSlot}
              >
                Suivant
              </button>
            </div>
          </div>
          <div className="slot-preview-stage">
            {previewPrevIndex !== null && (
              <div className={`slot-preview-item exit ${previewDirection}`}>
                {renderSlotCard(previewSlots[previewPrevIndex], previewPrevIndex)}
              </div>
            )}
            {previewIndex !== null && (
              <div
                className={`slot-preview-item ${
                  previewPrevIndex !== null ? `enter ${previewDirection}` : "static"
                }`}
              >
                {renderSlotCard(previewSlots[previewIndex], previewIndex, {
                  isHighlighted: previewIndex === quickHighlightIndex,
                })}
              </div>
            )}
          </div>
        </div>

        <h3 className="section-title section-title-spaced">Planning complet</h3>

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

                <button type="button" className="btn-secondary" onClick={openShiftModal}>
                  Décaler les rendez-vous d'aujourd'hui
                </button>
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
            onClick={() => { setOpenedFromSlot(false); setFieldErrors({}); setShowModal(true); }}
          >
            <Plus size={16} /> Ajouter un rendez-vous
          </button>
        </div>

        <div className="slot-duration-selector" style={{ marginBottom: "16px" }}>
          <label>Durée du créneau :</label>
          <ModernDropdown
            value={slotDuration}
            onChange={(v) => setSlotDuration(Number(v))}
            options={durationOptions.map((d) => ({ value: d, label: `${d} min` }))}
            ariaLabel="Durée du créneau"
            triggerClassName="slot-duration-select"
          />
        </div>

        {viewMode === "day" ? (
          <>
            <div className="planning-jump">
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToPlanningCurrentPatientSlot}
                disabled={planningFirstScheduledSlotIndex < 0}
              >
                Patient en cours
              </button>
              <button
                type="button"
                className="slot-preview-btn"
                onClick={goToPlanningNextAvailableSlot}
                disabled={planningNextAvailableSlotIndex < 0}
              >
                Créneau libre
              </button>
            </div>

            <div className="appointments-slots">
              {slots.map((slot, idx) =>
                renderSlotCard(slot, idx, {
                  slotRef: (el) => {
                    planningSlotRefs.current[idx] = el;
                  },
                  isHighlighted: idx === planningHighlightIndex,
                })
              )}
            </div>
          </>
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
                              <div
                                key={appt.id}
                                className="appointment-row"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPatientProfile(appt);
                                }}
                              >
                              <div className="slot-patient">
                                  <span>{getPatientName(appt)}</span>
                              </div>
                                <span className={`status-chip ${appt.status}`}>{statusLabels[appt.status] || appt.status}</span>

                                {appt.status !== "COMPLETED" && (
                                  <button
                                    className="action-btn edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditAppointment(appt);
                                    }}
                                    title="Mettre à jour"
                                  >
                                    <Edit2 size={16} />
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
              <div className="flex justify-between items-center mb-2">
                <h2>{isEditing ? "Modifier Rendez-vous" : "Ajouter Rendez-vous"}</h2>
                <X className="cursor-pointer" onClick={closeModal} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {isEditing ? "Modifiez les informations du rendez-vous puis enregistrez." : "Renseignez les informations du rendez-vous puis enregistrez."}
              </p>
              <form noValidate onSubmit={handleSubmit} className="modal-form">
                <label className={`chip-toggle ${isNewPatient ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isNewPatient}
                    onChange={(e) => {
                      setIsNewPatient(e.target.checked);
                      setFieldErrors({});
                    }}
                  />
                  Nouveau patient ?
                </label>

                {isNewPatient ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 appt-form-grid">
                      <div>
                        <span className="field-label">Prénom</span>
                        <input
                          type="text"
                          name="firstname"
                          placeholder="Entrez le prénom..."
                          value={newPatient.firstname}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewPatient((s) => ({ ...s, firstname: v }));
                            if (fieldErrors.firstname) setFieldErrors((prev) => ({ ...prev, firstname: "" }));
                          }}
                          required
                          maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                          className={fieldErrors.firstname ? "invalid" : ""}
                        />
                        <FieldError message={fieldErrors.firstname} />
                      </div>

                      <div>
                        <span className="field-label">Nom</span>
                        <input
                          type="text"
                          name="lastname"
                          placeholder="Entrez le nom..."
                          value={newPatient.lastname}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewPatient((s) => ({ ...s, lastname: v }));
                            if (fieldErrors.lastname) setFieldErrors((prev) => ({ ...prev, lastname: "" }));
                          }}
                          required
                          maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                          className={fieldErrors.lastname ? "invalid" : ""}
                        />
                        <FieldError message={fieldErrors.lastname} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 appt-form-grid">
                      <div>
                        <span className="field-label">Téléphone</span>
                        <PhoneInput
                          name="phone"
                          placeholder="Ex: 05 51 51 51 51"
                          value={newPatient.phone}
                          onChangeValue={(v) => {
                            setNewPatient((s) => ({ ...s, phone: v }));
                            if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                          }}
                          className={fieldErrors.phone ? "invalid" : ""}
                          required
                        />
                        <FieldError message={fieldErrors.phone} />
                      </div>

                      <div>
                        <span className="field-label">Âge</span>
                        <input
                          type="number"
                          name="age"
                          placeholder="Entrez l'age..."
                          value={newPatient.age}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewPatient((s) => ({ ...s, age: v }));
                            if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: "" }));
                          }}
                          min={AGE_LIMITS.MIN}
                          max={AGE_LIMITS.MAX}
                          step="1"
                          className={fieldErrors.age ? "invalid" : ""}
                        />
                        <FieldError message={fieldErrors.age} />
                      </div>
                    </div>

                    <div className="form-field">
                      <span className="field-label">Sexe</span>
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                            newPatient.sex === "Homme"
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="sex"
                            value="Homme"
                            checked={newPatient.sex === "Homme"}
                            onChange={handleSexChange}
                            className="sr-only"
                            required
                          />
                          Homme
                        </label>

                        <label
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                            newPatient.sex === "Femme"
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="sex"
                            value="Femme"
                            checked={newPatient.sex === "Femme"}
                            onChange={handleSexChange}
                            className="sr-only"
                            required
                          />
                          Femme
                        </label>
                      </div>
                      <FieldError message={fieldErrors.sex} />
                    </div>
                  </>
                ) : (
                  <div className="form-field" style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search patient..."
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      autoComplete="off"
                      required
                      className={fieldErrors.patientId ? "invalid" : ""}
                    />
                    {searchResults.length > 0 && (
                      <ul className="patient-search-dropdown">
                        {searchResults.map((p) => (
                          <li
                            key={p.id}
                            onClick={() => {
                              setFormData({...formData, patientId: p.id, patientName: `${p.firstname} ${p.lastname}`});
                              setPatientSearch(`${p.firstname} ${p.lastname}`);
                              setSearchResults([]);
                              if (fieldErrors.patientId) setFieldErrors((prev) => ({ ...prev, patientId: "" }));
                            }}
                          >
                            {p.firstname} {p.lastname} • {formatPhoneNumber(p.phone) || p.phone}
                          </li>
                        ))}
                      </ul>
                    )}
                    <FieldError message={fieldErrors.patientId} />
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
          className={`time-compact ${fieldErrors.hour ? "invalid" : ""}`}
          placeholder="HH"
          min={use12HourFormat ? 1 : hourBounds24.earliest}
          max={use12HourFormat ? 12 : hourBounds24.latest}
          value={formData.hour || ""}
          onChange={(e) => {
            setFormData({ ...formData, hour: e.target.value });
            if (fieldErrors.hour) setFieldErrors((prev) => ({ ...prev, hour: "" }));
          }}
          required
        />

        <span>:</span>

        <div className="modern-dropdown minute-dropdown" ref={minuteDropdownRef}>
           <button
             type="button"
             className={`dropdown-trigger ${minuteDropdownOpen ? "open" : ""} ${fieldErrors.minute ? "invalid" : ""}`}
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
                     if (fieldErrors.minute) setFieldErrors((prev) => ({ ...prev, minute: "" }));
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
        <FieldError message={fieldErrors.hour} />
        <FieldError message={fieldErrors.minute} />
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

        {showShiftModal && (
          <div
            className="modal-overlay"
            onClick={() => {
              setShiftErrors({});
              setShowShiftModal(false);
            }}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2>Décaler les rendez-vous</h2>
                <X
                  className="cursor-pointer"
                  onClick={() => {
                    setShiftErrors({});
                    setShowShiftModal(false);
                  }}
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Décalez tous les rendez-vous du jour ou une plage horaire.
              </p>
              <form
                className="modal-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  applyShiftAppointments();
                }}
              >
                <label>Direction</label>
                <ModernDropdown
                  value={shiftForm.direction}
                  onChange={(v) => {
                    setShiftForm({ ...shiftForm, direction: v });
                  }}
                  options={[
                    { value: "forward", label: "Vers le futur" },
                    { value: "backward", label: "Vers le passé" },
                  ]}
                  ariaLabel="Direction"
                  fullWidth
                />

                <label>Durée</label>
                <ModernDropdown
                  value={shiftForm.duration}
                  onChange={(v) => {
                    setShiftForm({ ...shiftForm, duration: Number(v) });
                  }}
                  options={durationOptions.map((d) => ({ value: d, label: `${d} min` }))}
                  ariaLabel="Durée"
                  fullWidth
                />

                <div className="form-field">
                  <label>Appliquer sur</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="shift-scope"
                        value="all"
                        checked={shiftForm.scope === "all"}
                        onChange={() => {
                          setShiftForm({ ...shiftForm, scope: "all" });
                          setShiftErrors({});
                        }}
                      />
                      <span>Tous les rendez-vous du jour</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="shift-scope"
                        value="range"
                        checked={shiftForm.scope === "range"}
                        onChange={() => {
                          setShiftForm({ ...shiftForm, scope: "range" });
                          setShiftErrors({});
                        }}
                      />
                      <span>Entre deux heures</span>
                    </label>
                  </div>
                </div>

                {shiftForm.scope === "range" && (
                  <div className="time-range-row">
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <input
                        type="time"
                        step="900"
                        value={shiftForm.startTime}
                        onChange={(e) => {
                          setShiftForm({ ...shiftForm, startTime: e.target.value });
                          if (shiftErrors.startTime) setShiftErrors((prev) => ({ ...prev, startTime: "" }));
                          if (shiftErrors.endTime) setShiftErrors((prev) => ({ ...prev, endTime: "" }));
                        }}
                        className={shiftErrors.startTime ? "invalid" : ""}
                      />
                      <FieldError message={shiftErrors.startTime} />
                    </div>
                    <span>→</span>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <input
                        type="time"
                        step="900"
                        value={shiftForm.endTime}
                        onChange={(e) => {
                          setShiftForm({ ...shiftForm, endTime: e.target.value });
                          if (shiftErrors.endTime) setShiftErrors((prev) => ({ ...prev, endTime: "" }));
                        }}
                        className={shiftErrors.endTime ? "invalid" : ""}
                      />
                      <FieldError message={shiftErrors.endTime} />
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShiftErrors({});
                      setShowShiftModal(false);
                    }}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary2" disabled={isShiftingAppointments}>
                    {isShiftingAppointments ? "Décalage..." : "Valider"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Complete */}
        {showCompleteConfirm && completeAppt && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="flex justify-between items-center mb-2">
                <h2>Marquer comme COMPLET ?</h2>
                <X className="cursor-pointer" onClick={() => setShowCompleteConfirm(false)} />
              </div>
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
              <div className="flex justify-between items-center mb-2">
                <h2>Annuler le rendez-vous ?</h2>
                <X className="cursor-pointer" onClick={() => setShowCancelConfirm(false)} />
              </div>
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
