import ServiceFeesPage from '../../components/ServiceFeesPage.jsx';

export default function TransportFees() {
  return (
    <ServiceFeesPage
      title="Transport fees"
      who="riders"
      button="Generate transport fees"
      listPath="/transport/assignments"
      generatePath="/transport/fees/generate"
      hint="Bills every student on transport their route's monthly fee. The bills appear in Fees & payments and are collected like any other fee. Running a month twice never double-bills."
    />
  );
}
