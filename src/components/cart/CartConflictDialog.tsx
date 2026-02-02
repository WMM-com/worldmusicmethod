import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CartConflictDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isAddingSubscription: boolean;
}

export function CartConflictDialog({
  open,
  onConfirm,
  onCancel,
  isAddingSubscription,
}: CartConflictDialogProps) {
  const title = isAddingSubscription
    ? "Replace cart with subscription?"
    : "Replace cart with this item?";

  const description = isAddingSubscription
    ? "Adding a subscription will remove all one-time purchases from your cart. Would you like to proceed?"
    : "Adding this item will remove the subscription from your cart. Would you like to proceed?";

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, replace cart
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
