// import ExampleLeadForm from "@/components/ExampleLeadForm";
// import Image from "next/image";

// export default function Home() {
//   return (
   
//     <>
//     <ExampleLeadForm  />
//     </>
//   );
// }
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}