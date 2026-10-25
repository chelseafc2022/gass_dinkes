import ClientPage from "../_client-page";

export default function Page() {
  return <ClientPage params={Promise.resolve({ kind: "kecamatan" })} />;
}

