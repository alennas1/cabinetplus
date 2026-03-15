import React from "react";
import Patients from "./Patients";

const ArchivedPatients = () => <Patients view="archived" showBackButton backFallbackTo="/patients" />;

export default ArchivedPatients;
