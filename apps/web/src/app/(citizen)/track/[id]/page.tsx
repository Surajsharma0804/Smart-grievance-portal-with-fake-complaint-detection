import type { Metadata } from 'next';

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Complaint ${id} - Nagrik Setu`,
    description: `Track the status of complaint ${id}`,
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Complaint {id}</h2>
      <div className="border rounded-lg p-6 bg-white">
        <p className="text-gray-600">Complaint tracking details will appear here.</p>
      </div>
    </div>
  );
}
