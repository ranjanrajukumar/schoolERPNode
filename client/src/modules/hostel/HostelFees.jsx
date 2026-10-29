import ServiceFeesPage from '../../components/ServiceFeesPage.jsx';

export default function HostelFees() {
  return (
    <ServiceFeesPage
      title="Hostel fees"
      who="boarders"
      button="Generate hostel fees"
      listPath="/hostel/allocations"
      generatePath="/hostel/fees/generate"
      hint="Bills every boarder their room's monthly fee. The bills appear in Fees & payments and are collected like any other fee. Running a month twice never double-bills."
    />
  );
}
