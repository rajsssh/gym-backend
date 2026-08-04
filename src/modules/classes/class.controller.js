import {
  createClassTypeService,
  listClassTypesService,
  createScheduleService,
  listSchedulesService,
  bookClassService,
  cancelBookingService,
  memberBookingsService,
  getAllScheduledClassesService,
  getScheduleByIdService,
  updateScheduleService,
  deleteScheduleService,
  getTrainersService,
  getPersonalAndGeneralTrainersService,
  getScheduledClassesWithBookingStatusService,
} from "./class.service.js";

export const createClassType = async (req, res, next) => {
  try {
    const r = await createClassTypeService(req.body.name); // ← yaha se sirf name ja raha hai
    res.json({ success: true, classType: r });
  } catch (err) {
    next(err);
  }
};

export const getTrainers = async (req, res, next) => {
  try {
    const trainers = await getTrainersService();
    res.json({ success: true, trainers });
  } catch (err) {
    next(err);
  }
};

export const listClassTypes = async (req, res, next) => {
  try {
    const r = await listClassTypesService();
    res.json({ success: true, classTypes: r });
  } catch (err) {
    next(err);
  }
};

// export const createSchedule = async (req, res, next) => {
//   try {
//     const r = await createScheduleService(req.body);
//     res.json({ success: true, schedule: r });
//   } catch (err) {
//     next(err);
//   }
// };

export const createSchedule = async (req, res) => {
  try {
    const schedule = await createScheduleService(req.body);

    return res.status(201).json({
      success: true,
      message: "Class schedule created successfully!",
      data: schedule,
    });
  } catch (error) {
    console.error("Create Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const listSchedules = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const r = await listSchedulesService(branchId);
    res.json({ success: true, schedules: r });
  } catch (err) {
    next(err);
  }
};

export const bookClass = async (req, res, next) => {
  try {
    const { memberId, scheduleId } = req.body;

    if (!memberId || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: "memberId & scheduleId are required",
      });
    }

    // 1️⃣ booking table me entry
    const booking = await bookClassService(memberId, scheduleId);

    // 2️⃣ ab schedule + trainer ka full detail lao
    const schedule = await getScheduleByIdService(scheduleId);

    // 3️⃣ response me merge karke bhejo
    return res.status(200).json({
      success: true,
      message: "Class booked successfully!",
      booking: {
        id: booking.id,
        memberId: booking.memberId,
        scheduleId: booking.scheduleId,

        // 🔽 ye sab modal ke liye extra
        className: schedule.className,
        date: schedule.date,
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        trainerName: schedule.trainerName,
        trainerExpertise: schedule.trainerExpertise, // agar field banayi hai
        price: schedule.price,

        durationMinutes: schedule.durationMinutes,
        branchName: schedule.branchName,
      },
    });
  } catch (error) {
    console.error("Book Class Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Booking failed",
    });
  }
};

// export const getScheduledClassesWithBookingStatus = async (req, res) => {
//   try {
//     const { memberId } = req.params; // frontend se userId aa raha hai

//     if (!memberId) {
//       return res.status(400).json({
//         success: false,
//         message: "memberId is required",
//       });
//     }

//     const data = await getScheduledClassesWithBookingStatusService(memberId);

//     return res.status(200).json({
//       success: true,
//       message: "Scheduled classes fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.error("Get Classes With Booking Status Error:", error);

//     return res.status(error.status || 500).json({
//       success: false,
//       message: error.message || "Something went wrong",
//     });
//   }
// };

export const getScheduledClassesWithBookingStatus = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { adminId } = req.query;

    if (!memberId || !adminId) {
      return res.status(400).json({
        success: false,
        message: "memberId and adminId are required",
      });
    }

    const data = await getScheduledClassesWithBookingStatusService(
      memberId,
      adminId
    );

    return res.status(200).json({
      success: true,
      message: "Scheduled classes fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Get Classes With Booking Status Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { memberId, scheduleId } = req.body;
    const r = await cancelBookingService(memberId, scheduleId);
    res.json({ success: true, message: "Booking cancelled" });
  } catch (err) {
    next(err);
  }
};

export const memberBookings = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const r = await memberBookingsService(memberId);
    res.json({ success: true, bookings: r });
  } catch (err) {
    next(err);
  }
};

// export const getAllScheduledClasses = async (req, res) => {
//   try {
//     const schedules = await getAllScheduledClassesService();

//     return res.status(200).json({
//       success: true,
//       message: "All scheduled classes fetched successfully",
//       data: schedules,
//     });

//   } catch (error) {
//     console.error("Get All Scheduled Classes Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Something went wrong",
//     });
//   }
// };

export const getAllScheduledClasses = async (req, res) => {
  try {
    const { adminId } = req.params;

    const schedules = await getAllScheduledClassesService(adminId);

    return res.status(200).json({
      success: true,
      message: "Scheduled classes fetched successfully",
      data: schedules,
    });
  } catch (error) {
    console.error("Get All Scheduled Classes Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await getScheduleByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Class schedule fetched successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Get Schedule By ID Error:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedSchedule = await updateScheduleService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Class schedule updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Update Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getPersonalAndGeneralTrainers = async (req, res, next) => {
  try {
    const { adminId } = req.query;
    const trainers = await getPersonalAndGeneralTrainersService(adminId);
    return res.status(200).json({
      success: true,
      trainers,
    });
  } catch (err) {
    console.error("Get Personal/General Trainers Error:", err);
    next(err);
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteScheduleService(id);

    return res.status(200).json({
      success: true,
      message: "Scheduled class deleted successfully!",
    });
  } catch (error) {
    console.error("Delete Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
